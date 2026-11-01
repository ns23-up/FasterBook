-- ОТКАТ миграции «книги в аккаунте». Запускайте, только если хотите убрать книги из аккаунтов.
-- ВНИМАНИЕ: удалит таблицу books вместе со сведениями о книгах всех пользователей.
-- Статистика, аккаунты и всё остальное не затрагивается.
--
-- Сначала очистите хранилище вручную: Storage → book-texts → выделить все файлы → Delete.
-- (Supabase не даёт удалять файлы командой SQL.) Потом выполните этот файл.

drop policy if exists "book_texts_select_own" on storage.objects;
drop policy if exists "book_texts_insert_own" on storage.objects;
drop policy if exists "book_texts_delete_own" on storage.objects;
delete from storage.buckets where id = 'book-texts';

drop table if exists public.books;
