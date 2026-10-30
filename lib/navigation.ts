export interface NavItem {
  href: string;
  label: string;
}

/** Единый список разделов: используется и боковой панелью, и нижней навигацией. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Главная" },
  { href: "/books", label: "Мои книги" },
  { href: "/favorites", label: "Избранное" },
  { href: "/friends", label: "Друзья" },
  { href: "/settings", label: "Настройки" },
];

/** Активен ли пункт для текущего пути. Главная активна только на точном совпадении. */
export function isActivePath(current: string, href: string): boolean {
  if (href === "/") {
    return current === "/";
  }
  return current === href || current.startsWith(`${href}/`);
}
