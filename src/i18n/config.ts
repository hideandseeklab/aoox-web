export const LOCALES = ["en", "id"] as const
export type Locale = (typeof LOCALES)[number]

/** Used when the cookie is missing or holds something we do not ship. */
export const DEFAULT_LOCALE: Locale = "en"

/** The locale lives in this cookie only (no URL prefix, nothing on the account or the API). */
export const LOCALE_COOKIE = "aoox_locale"

/** Shown in the language picker, each in its own language. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  id: "Bahasa Indonesia",
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value)
}
