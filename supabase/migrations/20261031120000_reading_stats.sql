-- ============================================================================
-- Fasterbook: статистика чтения и серия дней
-- ============================================================================
-- Миграция ТОЛЬКО ДОБАВЛЯЕТ новые объекты. Она ничего не удаляет и не меняет
-- в уже существующих таблицах. Её можно запускать повторно: ничего не сломается.
--
-- Что создаётся:
--   таблицы   reading_days, reading_finished_books, reading_state
--   функции   record_reading, mark_book_finished, get_reading_stats
--
-- Перед запуском выполните supabase/checks/00_check_existing.sql
-- (убедитесь, что таких таблиц у вас ещё нет).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. ТАБЛИЦЫ
-- ----------------------------------------------------------------------------

-- Одна строка = один день чтения одного пользователя.
-- Серию дней, рекорд и календарь мы считаем из этой таблицы, отдельных счётчиков
-- серии нет: так они не могут разойтись с реальной историей.
create table if not exists public.reading_days (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  day        date        not null,                       -- календарный день в часовом поясе пользователя
  seconds    integer     not null default 0 check (seconds >= 0 and seconds <= 86400),
  words      integer     not null default 0 check (words >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)                             -- два дня с одной датой невозможны
);

-- Завершённые книги. book_key — идентификатор книги из браузера.
-- Пара (user_id, book_key) уникальна, поэтому одну книгу нельзя «завершить» дважды.
create table if not exists public.reading_finished_books (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  book_key    text        not null check (char_length(book_key) between 1 and 100),
  finished_at timestamptz not null default now(),
  primary key (user_id, book_key)
);

-- Служебная таблица: когда мы в последний раз засчитывали время этому пользователю.
-- Нужна, чтобы нельзя было накрутить время частыми запросами (см. record_reading).
-- Клиенту доступа к ней нет вообще.
create table if not exists public.reading_state (
  user_id      uuid        primary key references auth.users (id) on delete cascade,
  last_ping_at timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 2. ЗАЩИТА ДАННЫХ (Row Level Security)
-- ----------------------------------------------------------------------------
-- RLS = «правила на уровне строк». Включённая RLS без правил закрывает таблицу
-- полностью; правила ниже открывают ровно то, что нужно.

alter table public.reading_days           enable row level security;
alter table public.reading_finished_books enable row level security;
alter table public.reading_state          enable row level security;

-- Пользователь может ЧИТАТЬ только свои строки.
-- (select auth.uid()) — id вошедшего пользователя; его подставляет сам Supabase
-- из проверенной сессии, подделать его из браузера нельзя.
drop policy if exists "reading_days_select_own" on public.reading_days;
create policy "reading_days_select_own"
  on public.reading_days for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "reading_finished_books_select_own" on public.reading_finished_books;
create policy "reading_finished_books_select_own"
  on public.reading_finished_books for select to authenticated
  using (user_id = (select auth.uid()));

-- Правил на INSERT / UPDATE / DELETE нет намеренно: из браузера таблицы изменить
-- нельзя. Записывать можно только через функции ниже, которые сами проверяют данные.
-- У reading_state нет вообще никаких правил: клиент не видит эту таблицу.

-- Дополнительный замок: убираем у ролей браузера все права и возвращаем только чтение.
revoke all on public.reading_days           from anon, authenticated;
revoke all on public.reading_finished_books from anon, authenticated;
revoke all on public.reading_state          from anon, authenticated;
grant select on public.reading_days           to authenticated;
grant select on public.reading_finished_books to authenticated;


-- ----------------------------------------------------------------------------
-- 3. ФУНКЦИИ
-- ----------------------------------------------------------------------------
-- Все функции:
--   * security definer — выполняются с правами владельца, поэтому могут писать в
--     таблицы, закрытые для браузера;
--   * set search_path = '' — защита от подмены имён таблиц, поэтому везде public.xxx;
--   * сами берут id пользователя из auth.uid(), а не принимают его от клиента.

-- ---- record_reading: засчитать время и слова ------------------------------
-- Браузер присылает раз в ~10 секунд: сколько секунд и слов прочитано с прошлой отправки.
-- Сервер НЕ верит этим числам слепо:
--   1) день должен быть «рядом» с сегодняшней датой по UTC (±1 сутки, это покрывает
--      все часовые пояса), нельзя записать себе чтение в прошлом году;
--   2) за один запрос — не больше 120 секунд;
--   3) «корзина времени»: засчитать можно не больше, чем реально прошло времени с прошлого
--      засчитывания (накопленный запас не больше 120 секунд). Частыми запросами накрутить нельзя;
--   4) слов не больше, чем возможно на максимальной скорости 1000 слов/мин (как в читалке).
create or replace function public.record_reading(p_day date, p_seconds integer, p_words integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_max_call_seconds constant integer := 120;    -- не больше за один запрос и размер «запаса» времени
  c_max_wpm          constant integer := 1000;   -- должен совпадать с MAX_WPM в lib/reader.ts
  v_user      uuid        := auth.uid();
  v_now       timestamptz := now();
  v_utc_today date        := (now() at time zone 'utc')::date;
  v_last      timestamptz;
  v_bucket    numeric;
  v_seconds   integer;
  v_words     integer;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_day is null or p_day < v_utc_today - 1 or p_day > v_utc_today + 1 then
    raise exception 'invalid_day' using errcode = '22023';
  end if;
  if p_seconds is null or p_seconds <= 0 or p_words is null or p_words < 0 then
    return jsonb_build_object('seconds', 0, 'words', 0);
  end if;

  -- Первая запись пользователя: даём небольшой стартовый запас 30 секунд
  insert into public.reading_state (user_id, last_ping_at)
  values (v_user, v_now - interval '30 seconds')
  on conflict (user_id) do nothing;

  -- Блокируем строку, чтобы два одновременных запроса не потратили один и тот же запас
  select last_ping_at into v_last
  from public.reading_state
  where user_id = v_user
  for update;

  v_bucket  := least(greatest(extract(epoch from (v_now - v_last)), 0), c_max_call_seconds);
  v_seconds := least(p_seconds, c_max_call_seconds, floor(v_bucket)::integer);
  -- +1 секунда запаса на округление
  v_words   := least(p_words, ceil((v_seconds + 1) * c_max_wpm / 60.0)::integer);

  -- Сдвигаем «время последнего засчитывания»: непотраченный запас остаётся,
  -- но никогда не больше 120 секунд
  update public.reading_state
  set last_ping_at = v_now - ((v_bucket - v_seconds) * interval '1 second')
  where user_id = v_user;

  if v_seconds > 0 then
    insert into public.reading_days as d (user_id, day, seconds, words)
    values (v_user, p_day, v_seconds, v_words)
    on conflict (user_id, day) do update
      set seconds    = least(d.seconds + excluded.seconds, 86400),
          words      = d.words + excluded.words,
          updated_at = now();
  else
    v_words := 0;
  end if;

  return jsonb_build_object('seconds', v_seconds, 'words', v_words);
end;
$$;

-- ---- mark_book_finished: отметить книгу завершённой ------------------------
create or replace function public.mark_book_finished(p_book_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_book_key is null or char_length(p_book_key) not between 1 and 100 then
    raise exception 'invalid_book_key' using errcode = '22023';
  end if;

  insert into public.reading_finished_books (user_id, book_key)
  values (v_user, p_book_key)
  on conflict (user_id, book_key) do nothing;        -- повтор ничего не меняет
end;
$$;

-- ---- get_reading_stats: вся статистика одним запросом ----------------------
-- p_today — сегодняшняя дата в часовом поясе пользователя (её присылает браузер).
-- День засчитывается в серию, если в нём прочитано не меньше v_min_seconds секунд:
-- случайное открытие книги серию не даёт. Порог можно поменять здесь (60 секунд).
create or replace function public.get_reading_stats(p_today date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c_min_seconds constant integer := 60;
  v_user          uuid := auth.uid();
  v_utc_today     date := (now() at time zone 'utc')::date;
  v_current       integer := 0;
  v_longest       integer := 0;
  v_total_seconds bigint  := 0;
  v_total_words   bigint  := 0;
  v_today_seconds integer := 0;
  v_finished      integer := 0;
  v_days          jsonb;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_today is null or p_today < v_utc_today - 1 or p_today > v_utc_today + 1 then
    raise exception 'invalid_day' using errcode = '22023';
  end if;

  -- Серии = группы подряд идущих дат. Приём: дата минус номер строки одинакова
  -- внутри серии и меняется при пропуске дня.
  with active as (
    select day from public.reading_days
    where user_id = v_user and seconds >= c_min_seconds
  ), numbered as (
    select day, day - (row_number() over (order by day))::integer as grp from active
  ), streaks as (
    select count(*)::integer as len, max(day) as last_day from numbered group by grp
  )
  select coalesce(max(len), 0),
         -- Текущая серия жива, если последний день серии — сегодня или вчера
         coalesce(max(len) filter (where last_day >= p_today - 1), 0)
  into v_longest, v_current
  from streaks;

  select coalesce(sum(seconds), 0), coalesce(sum(words), 0)
  into v_total_seconds, v_total_words
  from public.reading_days where user_id = v_user;

  select coalesce(sum(seconds), 0)::integer into v_today_seconds
  from public.reading_days where user_id = v_user and day = p_today;

  select count(*)::integer into v_finished
  from public.reading_finished_books where user_id = v_user;

  -- История по дням для календаря: последние 182 дня (26 недель)
  select coalesce(jsonb_agg(jsonb_build_object('day', day, 'seconds', seconds, 'words', words) order by day), '[]'::jsonb)
  into v_days
  from public.reading_days
  where user_id = v_user and day >= p_today - 182;

  return jsonb_build_object(
    'current_streak',      v_current,
    'longest_streak',      v_longest,
    'total_seconds',       v_total_seconds,
    'total_words',         v_total_words,
    'today_seconds',       v_today_seconds,
    'books_finished',      v_finished,
    'min_seconds_per_day', c_min_seconds,
    'days',                v_days
  );
end;
$$;


-- ----------------------------------------------------------------------------
-- 4. КТО МОЖЕТ ВЫЗЫВАТЬ ФУНКЦИИ
-- ----------------------------------------------------------------------------
-- Только вошедшие пользователи. Гости (anon) вызвать их не могут.
revoke all on function public.record_reading(date, integer, integer) from public, anon;
revoke all on function public.mark_book_finished(text)               from public, anon;
revoke all on function public.get_reading_stats(date)                from public, anon;
grant execute on function public.record_reading(date, integer, integer) to authenticated;
grant execute on function public.mark_book_finished(text)               to authenticated;
grant execute on function public.get_reading_stats(date)                to authenticated;

