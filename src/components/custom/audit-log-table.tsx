"use client"

import { LinkArrow } from "@/components/custom/arrows"
import { ChevronDown, ChevronRight, ScrollText, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "@/lib/use-router"
import { useState } from "react"
import { EmptyState } from "@/components/custom/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AuditLog } from "@/features/audit-log/audit-log.entity"
import { statusVariant, viaLabel } from "@/features/audit-log/audit-log.format"
import { formatDateTime } from "@/i18n/format"
import { useLocale, useTranslations } from "next-intl"

/** Newest first; `before` cursor from the last row for the next page. */
export function AuditLogTable({
  rows,
  action,
}: {
  rows: AuditLog[]
  action: string
}) {
  const t = useTranslations("settings")
  const c = useTranslations("common")
  const locale = useLocale()
  const router = useRouter()
  const [q, setQ] = useState(action)
  const [open, setOpen] = useState<string | null>(null)
  const last = rows[rows.length - 1]

  return (
    <div className="space-y-3">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          router.push(
            `/settings/audit-log${q.trim() ? `?action=${encodeURIComponent(q.trim())}` : ""}`
          )
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("audit.filterPlaceholder")}
          className="max-w-md font-mono text-xs"
          aria-label={t("audit.filterLabel")}
        />
        <Button type="submit" variant="outline">
          <Search data-icon="inline-start" />
          {c("actions.search")}
        </Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState icon={ScrollText} compact>
          {t("audit.empty")}
        </EmptyState>
      ) : (
        <ul className="divide-y rounded-md border text-xs">
          {rows.map((r) => {
            const expanded = open === r.id
            return (
              <li key={r.id} className="px-3 py-2">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      expanded ? t("audit.closeDetail") : t("audit.openDetail")
                    }
                    onClick={() => setOpen(expanded ? null : r.id)}
                  >
                    {expanded ? <ChevronDown /> : <ChevronRight />}
                  </Button>
                  <span className="w-36 shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(r.createdAt, locale, {
                      dateStyle: "medium",
                      timeStyle: "medium",
                    })}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs">
                      {r.action}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {r.actorEmail ?? "—"} · {viaLabel(r.via, t)}
                      {r.ip && ` · ${r.ip.replace(/^::ffff:/, "")}`}
                    </span>
                  </span>
                  <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                </div>
                {expanded && (
                  <pre className="mt-2 max-h-72 overflow-auto rounded bg-muted p-2 font-mono text-xs whitespace-pre-wrap">
                    {JSON.stringify(
                      { path: r.path, params: r.params, body: r.body },
                      null,
                      2
                    )}
                  </pre>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {last && rows.length >= 100 && (
        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/settings/audit-log?before=${encodeURIComponent(last.createdAt)}${action ? `&action=${encodeURIComponent(action)}` : ""}`}
            >
              {t("audit.older")}
              <LinkArrow />
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
