-- ============================================================================
-- Fasterbook: «друзья онлайн»
-- ============================================================================
-- Миграция только ДОБАВЛЯЕТ колонку и функцию и обновляет get_friends
-- (добавляет в ответ поле online). Ничего не удаляет. Можно запускать повторно.
-- Запускать ПОСЛЕ 20261103120000_friends.sql.
--
-- Как это работает: пока сайт открыт, браузер раз в 2 минуты вызывает mark_active().
-- Время ставит сама база (now()), поэтому подделать «я онлайн» из браузера нельзя.
-- Друг считается онлайн, если отметка была за последние 5 минут
-- и он не выключил «показывать друзьям активность».
-- ============================================================================

alter table public.profiles add column if not exists last_active_at timestamptz;

-- ---- mark_active: «я сейчас на сайте» ----
create or replace function public.mark_active()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  update public.profiles set last_active_at = now() where user_id = auth.uid();
end;
$$;

-- ---- get_friends: то же, что раньше, плюс поле online ----
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
           'online',       p.share_activity and coalesce(p.last_active_at > now() - interval '5 minutes', false),
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

revoke all on function public.mark_active()      from public, anon;
grant execute on function public.mark_active()   to authenticated;
revoke all on function public.get_friends(date)  from public, anon;
grant execute on function public.get_friends(date) to authenticated;
