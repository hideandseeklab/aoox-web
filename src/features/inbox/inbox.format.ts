/** The badge text: the count, capped so it fits the small circle. */
export function badgeText(unread: number): string {
  return unread > 99 ? "99+" : String(unread)
}
