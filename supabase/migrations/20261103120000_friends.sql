-- ============================================================================
-- Fasterbook: профили (никнейм и короткий ID) и друзья
-- ============================================================================
-- Миграция ТОЛЬКО ДОБАВЛЯЕТ. Книги, статистику и аккаунты не трогает.
-- Её можно запускать повторно: ничего не сломается.
-- Запускать ПОСЛЕ миграции статистики 20261031120000_reading_stats.sql
-- (серия дней друзей считается из таблицы reading_days).
--
-- Что создаётся:
--   таблицы   profiles, friendships
--   функции   find_profile, send_friend_request, respond_friend_request,
--             remove_friend, get_friends, fb_current_streak (служебная)
--
-- Что видят друзья: никнейм, серию дней и книгу, которую человек читал
-- за последние 14 дней. Если в профиле выключено «показывать активность» —
-- только никнейм. Почту не видит никто.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. ПРОФИЛИ
-- ----------------------------------------------------------------------------
-- public_id — короткий числовой ID для поиска друзей (начинается с 100001).
-- Его выдаёт база, поменять его нельзя.
create table if not exists public.profiles (
  user_id            uuid        primary key default auth.uid() references auth.users (id) on delete cascade,
  public_id          bigint      generated always as identity (start with 100001) unique,
  nickname           text        not null
                                 check (char_length(nickname) between 3 and 24
                                        and nickname = btrim(nickname)
                                        and nickname !~ '[[:cntrl:]]'),
  share_activity     boolean     not null default true,   -- показывать друзьям серию и книгу
  current_book_title text        check (char_length(current_book_title) <= 300),
  current_book_at    timestamptz,                          -- когда последний раз открывали книгу
  created_at         timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Свой профиль: видеть, создать, менять. Чужие профили напрямую не видны —
-- только через функции ниже, и только то, что разрешено.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Создавая профиль, можно указать только никнейм и настройку; user_id подставится сам.
-- Менять можно никнейм, настройку и «что читаю». ID и владельца поменять нельзя.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (nickname, share_activity) on public.profiles to authenticated;
grant update (nickname, share_activity, current_book_title, current_book_at) on public.profiles to authenticated;


-- ----------------------------------------------------------------------------
-- 2. ДРУЗЬЯ И ЗАЯВКИ
-- ----------------------------------------------------------------------------
-- Одна строка на пару людей. pending — заявка ждёт ответа, accepted — друзья.
create table if not exists public.friendships (
  requester_id uuid        not null references auth.users (id) on delete cascade,  -- кто отправил заявку
  addressee_id uuid        not null references auth.users (id) on delete cascade,  -- кому
  status       text        not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

-- Пара людей может быть только одна, в какую сторону ни отправляй заявку
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

-- Из браузера таблицу не видно и не изменить: всё только через функции ниже
alter table public.friendships enable row level security;
revoke all on public.friendships from anon, authenticated;


-- ----------------------------------------------------------------------------
-- 3. ФУНКЦИИ
-- ----------------------------------------------------------------------------
-- security definer — работают с правами владельца базы; set search_path = '' —
-- защита от подмены имён. id вызывающего берётся из auth.uid(), не от браузера.

-- ---- fb_current_streak: текущая серия дней (служебная, из браузера не вызвать) ----
-- Правило то же, что в get_reading_stats: день засчитан, если прочитано от 60 секунд.
create or replace function public.fb_current_streak(p_user uuid, p_today date)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with active as (
    select day from public.reading_days where user_id = p_user and seconds >= 60
  ), numbered as (
    select day, day - (row_number() over (order by day))::integer as grp from active
  ), streaks as (
    select count(*)::integer as len, max(day) as last_day from numbered group by grp
  )
  select coalesce(max(len) filter (where last_day >= p_today - 1), 0) from streaks;
$$;

-- ---- find_profile: найти человека по ID (никнейм и кем он вам приходится) ----
create or replace function public.find_profile(p_public_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me     uuid := auth.uid();
  v_target public.profiles%rowtype;
  v_row    public.friendships%rowtype;
  v_rel    text := 'none';
begin
  if v_me is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_target from public.profiles where public_id = p_public_id;
  if not found then
    return null;
  end if;

  if v_target.user_id = v_me then
    v_rel := 'self';
  else
    select * into v_row from public.friendships
    where (requester_id = v_me and addressee_id = v_target.user_id)
       or (requester_id = v_target.user_id and addressee_id = v_me);
    if found then
      v_rel := case
        when v_row.status = 'accepted' then 'friend'
        when v_row.requester_id = v_me then 'outgoing'
        else 'incoming'
      end;
    end if;
  end if;

  return jsonb_build_object('public_id', v_target.public_id, 'nickname', v_target.nickname, 'relation', v_rel);
end;
$$;

-- ---- send_friend_request: отправить заявку по ID ----
-- Ответ: sent (отправлена), accepted (была встречная заявка — теперь друзья),
-- already_sent, already_friends.
create or replace function public.send_friend_request(p_public_id bigint)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_max_pending constant integer := 50;  -- столько неотвеченных заявок можно держать (защита от спама)
  v_me     uuid := auth.uid();
  v_target uuid;
  v_row    public.friendships%rowtype;
begin
  if v_me is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles where user_id = v_me) then
    raise exception 'no_profile';
  end if;

  select user_id into v_target from public.profiles where public_id = p_public_id;
  if v_target is null then
    raise exception 'not_found';
  end if;
  if v_target = v_me then
    raise exception 'self';
  end if;

  select * into v_row from public.friendships
  where (requester_id = v_me and addressee_id = v_target)
     or (requester_id = v_target and addressee_id = v_me)
  for update;

  if found then
    if v_row.status = 'accepted' then
      return 'already_friends';
    end if;
    if v_row.requester_id = v_me then
      return 'already_sent';
    end if;
    -- Этот человек сам уже звал вас в друзья: принимаем его заявку
    update public.friendships
    set status = 'accepted', accepted_at = now()
    where requester_id = v_target and addressee_id = v_me;
    return 'accepted';
  end if;

  if (select count(*) from public.friendships where requester_id = v_me and status = 'pending') >= c_max_pending then
    raise exception 'too_many_requests';
  end if;

  begin
    insert into public.friendships (requester_id, addressee_id) values (v_me, v_target);
  exception when unique_violation then
    -- Одновременно пришла встречная заявка: пара уже есть
    return 'already_sent';
  end;
  return 'sent';
end;
$$;

-- ---- respond_friend_request: принять или отклонить входящую заявку ----
create or replace function public.respond_friend_request(p_public_id bigint, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me     uuid := auth.uid();
  v_target uuid;
begin
  if v_me is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select user_id into v_target from public.profiles where public_id = p_public_id;
  if v_target is null then
    raise exception 'not_found';
  end if;

  if p_accept then
    update public.friendships
    set status = 'accepted', accepted_at = now()
    where requester_id = v_target and addressee_id = v_me and status = 'pending';
    return case when found then 'accepted' else 'not_found' end;
  end if;

  delete from public.friendships
  where requester_id = v_target and addressee_id = v_me and status = 'pending';
  return 'declined';
end;
$$;

-- ---- remove_friend: удалить из друзей или отменить свою заявку ----
create or replace function public.remove_friend(p_public_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me     uuid := auth.uid();
  v_target uuid;
begin
  if v_me is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select user_id into v_target from public.profiles where public_id = p_public_id;
  if v_target is null then
    return;
  end if;
  delete from public.friendships
  where (requester_id = v_me and addressee_id = v_target)
     or (requester_id = v_target and addressee_id = v_me);
end;
$$;

-- ---- get_friends: друзья, входящие и отправленные заявки одним запросом ----
-- p_today — сегодняшняя дата у вызывающего (для серии дней).
create or replace function public.get_friends(p_today date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me        uuid := auth.uid();
  v_utc_today date := (now() at time zone 'utc')::date;
  v_friends   jsonb;
  v_incoming  jsonb;
  v_outgoing  jsonb;
begin
  if v_me is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_today is null or p_today < v_utc_today - 1 or p_today > v_utc_today + 1 then
    raise exception 'invalid_day' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'public_id',    p.public_id,
           'nickname',     p.nickname,
           'shares',       p.share_activity,
           'streak',       case when p.share_activity then public.fb_current_streak(p.user_id, p_today) end,
           'current_book', case when p.share_activity and p.current_book_at > now() - interval '14 days'
                                then p.current_book_title end
         ) order by lower(p.nickname)), '[]'::jsonb)
  into v_friends
  from public.friendships f
  join public.profiles p
    on p.user_id = case when f.requester_id = v_me then f.addressee_id else f.requester_id end
  where f.status = 'accepted' and v_me in (f.requester_id, f.addressee_id);

  select coalesce(jsonb_agg(jsonb_build_object('public_id', p.public_id, 'nickname', p.nickname)
                            order by f.created_at desc), '[]'::jsonb)
  into v_incoming
  from public.friendships f
  join public.profiles p on p.user_id = f.requester_id
  where f.status = 'pending' and f.addressee_id = v_me;

  select coalesce(jsonb_agg(jsonb_build_object('public_id', p.public_id, 'nickname', p.nickname)
                            order by f.created_at desc), '[]'::jsonb)
  into v_outgoing
  from public.friendships f
  join public.profiles p on p.user_id = f.addressee_id
  where f.status = 'pending' and f.requester_id = v_me;

  return jsonb_build_object('friends', v_friends, 'incoming', v_incoming, 'outgoing', v_outgoing);
end;
$$;


-- ----------------------------------------------------------------------------
-- 4. КТО МОЖЕТ ВЫЗЫВАТЬ ФУНКЦИИ
-- ----------------------------------------------------------------------------
-- Служебную fb_current_streak из браузера не вызвать никому.
revoke all on function public.fb_current_streak(uuid, date) from public, anon, authenticated;

revoke all on function public.find_profile(bigint)                    from public, anon;
revoke all on function public.send_friend_request(bigint)             from public, anon;
revoke all on function public.respond_friend_request(bigint, boolean) from public, anon;
revoke all on function public.remove_friend(bigint)                   from public, anon;
revoke all on function public.get_friends(date)                       from public, anon;
grant execute on function public.find_profile(bigint)                    to authenticated;
grant execute on function public.send_friend_request(bigint)             to authenticated;
grant execute on function public.respond_friend_request(bigint, boolean) to authenticated;
grant execute on function public.remove_friend(bigint)                   to authenticated;
grant execute on function public.get_friends(date)                       to authenticated;
