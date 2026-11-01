-- ============================================================================
-- Fasterbook: книги в аккаунте
-- ============================================================================
-- Миграция ТОЛЬКО ДОБАВЛЯЕТ новые объекты. Статистику и аккаунты не трогает.
-- Её можно запускать повторно: ничего не сломается.
--
-- Что создаётся:
--   таблица     books               — сведения о книге и место, где остановились
--   хранилище   book-texts          — закрытое хранилище файлов, в нём тексты книг
--   правила     доступа (RLS)       — каждый видит и меняет только свои книги
--
-- Текст книги лежит не в таблице, а файлом в хранилище: он может весить
-- мегабайты, а таблице так легче. Путь файла: «id пользователя/id книги.txt».
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. ТАБЛИЦА books
-- ----------------------------------------------------------------------------
create table if not exists public.books (
  id         uuid        primary key default gen_random_uuid(),
  -- Владелец. По умолчанию — тот, кто вошёл; подставляет сам Supabase
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  title      text        not null check (char_length(title) between 1 and 300),
  author     text        not null default '' check (char_length(author) <= 300),
  word_count integer     not null default 0 check (word_count >= 0),
  position   integer     not null default 0 check (position >= 0),  -- номер слова
  added_at   timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Быстрый список «мои книги, сначала недавние»
create index if not exists books_user_updated_idx on public.books (user_id, updated_at desc);


-- ----------------------------------------------------------------------------
-- 2. ЗАЩИТА ТАБЛИЦЫ (Row Level Security)
-- ----------------------------------------------------------------------------
alter table public.books enable row level security;

drop policy if exists "books_select_own" on public.books;
create policy "books_select_own"
  on public.books for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "books_insert_own" on public.books;
create policy "books_insert_own"
  on public.books for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "books_update_own" on public.books;
create policy "books_update_own"
  on public.books for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "books_delete_own" on public.books;
create policy "books_delete_own"
  on public.books for delete to authenticated
  using (user_id = (select auth.uid()));

-- Гости (anon) к таблице доступа не имеют. Вошедшие могут читать, добавлять и удалять,
-- а менять — только название, автора и позицию (владельца поменять нельзя).
revoke all on public.books from anon, authenticated;
grant select, insert, delete on public.books to authenticated;
grant update (title, author, position, updated_at) on public.books to authenticated;


-- ----------------------------------------------------------------------------
-- 3. ХРАНИЛИЩЕ ТЕКСТОВ book-texts
-- ----------------------------------------------------------------------------
-- public = false: файлы нельзя открыть по ссылке, только через вход в аккаунт.
-- Ограничение размера файла: 50 МБ.
insert into storage.buckets (id, name, public, file_size_limit)
values ('book-texts', 'book-texts', false, 52428800)
on conflict (id) do nothing;

-- Файлы лежат в папке с именем = id пользователя. Правила пускают только в свою папку.
drop policy if exists "book_texts_select_own" on storage.objects;
create policy "book_texts_select_own"
  on storage.objects for select to authenticated
  using (bucket_id = 'book-texts' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "book_texts_insert_own" on storage.objects;
create policy "book_texts_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'book-texts' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "book_texts_delete_own" on storage.objects;
create policy "book_texts_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'book-texts' and (storage.foldername(name))[1] = (select auth.uid())::text);
