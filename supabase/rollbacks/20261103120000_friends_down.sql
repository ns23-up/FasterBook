-- ОТКАТ миграции «профили и друзья». Запускайте, только если хотите убрать друзей.
-- ВНИМАНИЕ: удалит все профили (никнеймы, ID) и всех друзей и заявки.
-- Книги, цитаты, статистика и аккаунты не затрагиваются.

drop function if exists public.get_friends(date);
drop function if exists public.remove_friend(bigint);
drop function if exists public.respond_friend_request(bigint, boolean);
drop function if exists public.send_friend_request(bigint);
drop function if exists public.find_profile(bigint);
drop function if exists public.fb_current_streak(uuid, date);

drop table if exists public.friendships;
drop table if exists public.profiles;
