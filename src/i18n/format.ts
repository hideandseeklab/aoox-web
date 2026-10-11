/**
 * Date, time, number and relative-time formatting that follows the active locale.
 * Pure functions: get the locale with `useLocale()` (client) or `getLocale()` (server)
 * and pass it in. Never hardcode a locale such as "id-ID" in a component.
 */
type DateInput = string | number | Date

const toDate = (value: DateInput) => (value instanceof Date ? value : new Date(value))

export function formatDateTime(
  value: DateInput,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }
): string {
  return new Intl.DateTimeFormat(locale, options).format(toDate(value))
}

export function formatDate(
  value: DateInput,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }
): string {
  return new Intl.DateTimeFormat(locale, options).format(toDate(value))
}

export function formatTime(
  value: DateInput,
  locale: string,
  options: Intl.DateTimeFormatOptions = { timeStyle: "medium" }
): string {
  return new Intl.DateTimeFormat(locale, options).format(toDate(value))
}

export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, options).format(value)
}

/** "5 minutes ago" (en) / "5 menit yang lalu" (id locale output): the largest whole unit, never in the future. */
export function formatRelative(
  value: DateInput,
  locale: string,
  now: number = Date.now()
): string {
  const seconds = Math.max(0, (now - toDate(value).getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  if (seconds < 60) return rtf.format(0, "second")
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return rtf.format(-minutes, "minute")
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return rtf.format(-hours, "hour")
  return rtf.format(-Math.floor(hours / 24), "day")
}
