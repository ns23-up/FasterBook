"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Avatar, cardClass } from "@/components/ui";
import type { DemoFriend } from "@/lib/demo-data";

/**
 * Список демо-друзей с поиском.
 * Подписка живёт только в памяти страницы и сбрасывается при перезагрузке.
 */
export function FriendsClient({ friends }: { friends: DemoFriend[] }) {
  const [query, setQuery] = useState("");
  const [followed, setFollowed] = useState<Set<string>>(() => new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return friends.filter((friend) => q === "" || friend.name.toLowerCase().includes(q));
  }, [friends, query]);

  const online = filtered.filter((friend) => friend.online);
  const offline = filtered.filter((friend) => !friend.online);

  function toggle(id: string) {
    setFollowed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <label className="relative sm:max-w-sm">
        <span className="sr-only">Поиск друзей</span>
        <Icon
          name="search"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск друзей…"
          className="w-full rounded-xl border border-white/10 bg-ink-deep/70 py-2.5 pl-10 pr-4 text-sm text-cream placeholder:text-cream-muted/70 focus:border-accent/50 focus:outline-none"
        />
      </label>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-cream-muted">
          Никого не нашли по запросу «{query}».
        </div>
      ) : (
        <>
          <FriendGroup title={`Онлайн (${online.length})`} friends={online} followed={followed} onToggle={toggle} />
          <FriendGroup title={`Не в сети (${offline.length})`} friends={offline} followed={followed} onToggle={toggle} />
        </>
      )}
    </div>
  );
}

function FriendGroup({
  title,
  friends,
  followed,
  onToggle,
}: {
  title: string;
  friends: DemoFriend[];
  followed: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (friends.length === 0) {
    return null;
  }
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-cream-muted">{title}</h2>
      <ul className={`divide-y divide-white/5 ${cardClass}`}>
        {friends.map((friend) => {
          const isFollowed = followed.has(friend.id);
          return (
            <li key={friend.id} className="flex items-center gap-4 p-4">
              <Avatar name={friend.name} online={friend.online} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-cream">{friend.name}</p>
                <p className="truncate text-xs text-cream-muted">
                  <span className={friend.online ? "text-online" : ""}>{friend.online ? "Онлайн" : "Офлайн"}</span>
                  {" · "}читает «{friend.nowReading}»
                </p>
              </div>
              <button
                type="button"
                onClick={() => onToggle(friend.id)}
                aria-pressed={isFollowed}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                  isFollowed
                    ? "border border-white/10 text-cream hover:bg-white/5"
                    : "bg-accent text-ink hover:bg-accent-hover"
                }`}
              >
                {isFollowed ? "Отписаться" : "Подписаться"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
