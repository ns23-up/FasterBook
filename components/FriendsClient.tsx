"use client";

import { useState } from "react";
import type { DemoFriend } from "@/lib/demo-data";

/** Подписка на демо-профили живёт только в памяти страницы и сбрасывается при перезагрузке. */
export function FriendsClient({ friends }: { friends: DemoFriend[] }) {
  const [followed, setFollowed] = useState<Set<string>>(() => new Set());

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
    <ul className="grid gap-3 sm:grid-cols-2">
      {friends.map((friend) => {
        const isFollowed = followed.has(friend.id);
        return (
          <li
            key={friend.id}
            className="flex items-center gap-4 rounded-2xl border border-white/5 bg-ink-soft/50 p-4"
          >
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-graphite text-base font-semibold text-cream"
            >
              {friend.name.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-semibold text-cream">
                {friend.name}
                <span
                  aria-label={friend.online ? "В сети" : "Не в сети"}
                  className={`h-2 w-2 rounded-full ${friend.online ? "bg-accent" : "bg-cream-muted/40"}`}
                />
              </p>
              <p className="truncate text-xs text-cream-muted">
                Читает «{friend.nowReading}»
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggle(friend.id)}
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
  );
}
