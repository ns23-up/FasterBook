import type { IconName } from "@/components/Icon";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

/** Единый список разделов: используется и боковой панелью, и нижней навигацией. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", icon: "home", label: "Главная" },
  { href: "/books", icon: "books", label: "Мои книги" },
  { href: "/favorites", icon: "heart", label: "Избранное" },
  { href: "/friends", icon: "friends", label: "Друзья" },
  { href: "/settings", icon: "settings", label: "Настройки" },
];

/** Активен ли пункт для текущего пути. Главная активна только на точном совпадении. */
export function isActivePath(current: string, href: string): boolean {
  if (href === "/") {
    return current === "/";
  }
  return current === href || current.startsWith(`${href}/`);
}
