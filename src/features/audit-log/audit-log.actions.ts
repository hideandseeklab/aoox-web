"use server"

import { getTranslations } from "next-intl/server"
import type { AuditLog } from "./audit-log.entity"
import { listAuditLogs } from "./audit-log.queries"

/** The dashboard card's page size. */
const RECENT_ACTIVITY_LIMIT = 10

export type RecentActivity =
  { ok: true; rows: AuditLog[] } | { ok: false; error: string }

/** Polled by the dashboard card (owner/admin; the API refuses anyone else). */
export async function fetchRecentActivityAction(): Promise<RecentActivity> {
  try {
    return {
      ok: true,
      rows: await listAuditLogs({ limit: RECENT_ACTIVITY_LIMIT }),
    }
  } catch {
    const t = await getTranslations("settings")
    return { ok: false, error: t("errors.recentActivity") }
  }
}
