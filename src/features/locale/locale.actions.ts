"use server"

import { cookies } from "next/headers"
import { isLocale, LOCALE_COOKIE } from "@/i18n/config"

/** Stores the chosen language in the cookie; the client then refreshes the route. */
export async function setLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return
  ;(await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })
}
