-- ОТКАТ «друзья онлайн». Выключает отметки активности: никто больше не будет «в сети».
-- Колонку last_active_at специально не удаляем: на неё опирается функция get_friends,
-- без колонки раздел «Друзья» перестанет загружаться. Пустая колонка ничему не мешает.

drop function if exists public.mark_active();
update public.profiles set last_active_at = null;
