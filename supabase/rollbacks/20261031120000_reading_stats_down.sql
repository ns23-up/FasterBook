-- ОТКАТ миграции статистики. Запускайте, только если хотите убрать статистику.
-- ВНИМАНИЕ: удалит ТОЛЬКО три таблицы и три функции статистики вместе с накопленной
-- статистикой чтения. Аккаунты и всё остальное в базе не затрагивается.

drop function if exists public.record_reading(date, integer, integer);
drop function if exists public.mark_book_finished(text);
drop function if exists public.get_reading_stats(date);

drop table if exists public.reading_days;
drop table if exists public.reading_finished_books;
drop table if exists public.reading_state;
