"use client"

import { useTranslations } from "next-intl"
import { createContext, useContext } from "react"

/**
 * IANA time zone the API runs in (`timeZone` of `/auth/me`, set with `TZ` on
 * the api container). Cron schedules are evaluated in it, not in the browser's
 * zone, so forms that edit a schedule say so.
 */
const ServerTimeZoneContext = createContext<string | null>(null)

export function ServerTimeZoneProvider({
  timeZone,
  children,
}: {
  timeZone: string | undefined
  children: React.ReactNode
}) {
  return (
    <ServerTimeZoneContext.Provider value={timeZone ?? null}>
      {children}
    </ServerTimeZoneContext.Provider>
  )
}

/** One muted line under a schedule field: "Times are in UTC (server time zone)". */
export function ScheduleTimeZoneHint() {
  const t = useTranslations("common")
  const zone = useContext(ServerTimeZoneContext)
  // An API that predates the field: say nothing rather than guess.
  if (!zone) return null
  return (
    <p className="w-full text-xs text-muted-foreground sm:col-span-2">
      {t("scheduleTimeZone", { zone })}
    </p>
  )
}
