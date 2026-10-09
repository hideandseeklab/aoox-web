/** "baru saja", "5 menit lalu", "2 jam lalu", "3 hari lalu". */
export function relativeTime(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000)
  if (s < 60) return "baru saja"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} menit lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  return `${Math.floor(h / 24)} hari lalu`
}

/** The badge text: the count, capped so it fits the small circle. */
export function badgeText(unread: number): string {
  return unread > 99 ? "99+" : String(unread)
}
