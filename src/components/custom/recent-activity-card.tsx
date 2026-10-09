"use client"

import { ActivityList } from "@/components/custom/activity-list"
import { LinkArrow } from "@/components/custom/arrows"
import Link from "next/link"
import { useEffect, useState, useSyncExternalStore } from "react"
import { Activity } from "lucide-react"
import { EmptyState } from "@/components/custom/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  fetchRecentActivityAction,
  type RecentActivity,
} from "@/features/audit-log/audit-log.actions"
import type { AuditLog } from "@/features/audit-log/audit-log.entity"
import { describeAction } from "@/features/audit-log/audit-log.format"
import { formatDateTime } from "@/i18n/format"
import { useLocale, useTranslations } from "next-intl"

const POLL_MS = 30_000
const VIA_KEYS = { session: 1, token: 1, webhook: 1, anonymous: 1 } as const

function statusBadge(status: number) {
  if (status >= 500)
    return {
      key: "failed" as const,
      className:
        "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
    }
  if (status >= 400)
    return {
      key: "denied" as const,
      className:
        "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    }
  return {
    key: "success" as const,
    className:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  }
}

function formatTime(iso: string, locale: string) {
  return formatDateTime(iso, locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Dashboard card (owner/admin only; the page does not render it for anyone else): the latest
 * audit-log entries in short form. Refreshes every 30 s while the tab is visible. Request
 * bodies and params are never shown here; the full Audit log page has them.
 */
export function RecentActivityCard({ initial }: { initial: RecentActivity }) {
  const locale = useLocale()
  const t = useTranslations("dashboard.activity")
  const ts = useTranslations("settings")
  const [data, setData] = useState(initial)
  const visible = useSyncExternalStore(
    (cb) => {
      document.addEventListener("visibilitychange", cb)
      return () => document.removeEventListener("visibilitychange", cb)
    },
    () => document.visibilityState === "visible",
    () => true
  )

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    const tick = async () => {
      const next = await fetchRecentActivityAction()
      // A failed refresh keeps the rows already shown.
      if (!cancelled && (next.ok || !data.ok)) setData(next)
    }
    const timer = setInterval(() => void tick(), POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [visible, data.ok])

  const via = (v: string) =>
    v in VIA_KEYS ? t(`via.${v as keyof typeof VIA_KEYS}`) : v
  const rows: AuditLog[] = data.ok ? data.rows : []

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/settings/audit-log">
              {t("viewAll")}
              <LinkArrow />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {!data.ok ? (
          <p className="text-xs text-destructive" role="alert">
            {data.error}
          </p>
        ) : rows.length === 0 ? (
          <EmptyState icon={Activity} compact>
            {t("empty")}
          </EmptyState>
        ) : (
          <ActivityList
            items={rows.map((r) => {
              const st = statusBadge(r.status)
              return {
                id: r.id,
                time: formatTime(r.createdAt, locale),
                title: describeAction(r.action, ts),
                titleHint: r.action,
                detail: `${r.actorEmail ?? "—"} · ${via(r.via)}`,
                trailing: (
                  <Badge
                    variant="outline"
                    className={st.className}
                    title={String(r.status)}
                  >
                    {t(`status.${st.key}`)}
                  </Badge>
                ),
              }
            })}
          />
        )}
      </CardContent>
    </Card>
  )
}
