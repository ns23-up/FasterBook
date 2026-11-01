-- Проверка ПЕРЕД миграцией. Ничего не меняет, только показывает.
-- Вставьте в Supabase → SQL Editor и нажмите Run.

-- 1) Какие таблицы уже есть в вашей базе (схема public).
--    Если среди них есть reading_days, reading_finished_books или reading_state,
--    НЕ запускайте миграцию, а покажите результат Claude.
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

-- 2) Есть ли уже функции с такими именами (должно быть пусто).
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('record_reading', 'mark_book_finished', 'get_reading_stats');

-- 3) Для миграции книг (20261101120000_books.sql): есть ли уже таблица books
--    и хранилище book-texts. Если таблица books уже есть и она не от Fasterbook,
--    НЕ запускайте миграцию, а покажите результат Claude.
select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'books';

select id from storage.buckets where id = 'book-texts';

-- 4) Для миграции избранного (20261102120000_favorites.sql): таблица books должна
--    уже быть (пункт 3), а таблицы quotes ещё не должно быть.
select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'quotes';

-- 5) Для миграции друзей (20261103120000_friends.sql): таблиц profiles и friendships
--    ещё не должно быть, а reading_days (статистика) уже должна быть.
--    Если profiles уже есть (например, от другого проекта), НЕ запускайте, покажите результат Claude.
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('profiles', 'friendships', 'reading_days');

-- 6) Для миграции «друзья онлайн» (20261104120000_friends_online.sql): должна вернуться
--    одна строка — функция get_friends (значит, миграция друзей выполнена).
select routine_name from information_schema.routines
where routine_schema = 'public' and routine_name = 'get_friends';
