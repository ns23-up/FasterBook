-- ============================================================================
-- Fasterbook: избранное — любимые книги и цитаты
-- ============================================================================
-- Миграция ТОЛЬКО ДОБАВЛЯЕТ. Существующие книги, статистику и аккаунты не трогает.
-- Её можно запускать повторно: ничего не сломается.
-- Запускать ПОСЛЕ 20261101120000_books.sql (нужна таблица books).
--
-- Что создаётся:
--   колонка   books.is_favorite  — книга в «Любимых» (у всех книг по умолчанию false)
--   таблица   quotes             — сохранённые цитаты
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. ЛЮБИМЫЕ КНИГИ
-- ----------------------------------------------------------------------------
alter table public.books add column if not exists is_favorite boolean not null default false;

-- Разрешаем менять эту колонку (остальные права на books не меняются)
grant update (is_favorite) on public.books to authenticated;


-- ----------------------------------------------------------------------------
-- 2. ЦИТАТЫ
-- ----------------------------------------------------------------------------
-- book_title и book_author хранятся копией: если книгу удалить, цитата останется
-- и будет понятно, откуда она. book_id при удалении книги становится пустым.
create table if not exists public.quotes (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  book_id     uuid        references public.books (id) on delete set null,
  book_title  text        not null default '' check (char_length(book_title) <= 300),
  book_author text        not null default '' check (char_length(book_author) <= 300),
  text        text        not null check (char_length(text) between 1 and 2000),
  position    integer     not null default 0 check (position >= 0),  -- номер слова в книге
  created_at  timestamptz not null default now()
);

create index if not exists quotes_user_created_idx on public.quotes (user_id, created_at desc);
create index if not exists quotes_book_idx on public.quotes (book_id);

alter table public.quotes enable row level security;

drop policy if exists "quotes_select_own" on public.quotes;
create policy "quotes_select_own"
  on public.quotes for select to authenticated
  using (user_id = (select auth.uid()));

-- Добавлять цитату можно только себе и только к своей книге
drop policy if exists "quotes_insert_own" on public.quotes;
create policy "quotes_insert_own"
  on public.quotes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      book_id is null
      or exists (select 1 from public.books b where b.id = book_id and b.user_id = (select auth.uid()))
    )
  );

drop policy if exists "quotes_delete_own" on public.quotes;
create policy "quotes_delete_own"
  on public.quotes for delete to authenticated
  using (user_id = (select auth.uid()));

-- Менять цитаты нельзя (только добавить или удалить). Гостям доступа нет.
revoke all on public.quotes from anon, authenticated;
grant select, insert, delete on public.quotes to authenticated;
