"use client"

import {
  History,
  Loader2,
  Play,
  Rocket,
  ScrollText,
  Square,
  Trash2,
  Webhook,
} from "lucide-react"
import { Fragment, useEffect, useState, useTransition } from "react"
import {
  DataActions,
  DataActionsHead,
  DataCell,
  DataDetailRow,
  DataHead,
  DataRow,
  DataTable,
  DataTableBody,
  DataTableHeader,
  IconButton,
} from "@/components/custom/data-table"
import { LogViewer } from "@/components/custom/log-viewer"
import { EmptyState } from "@/components/custom/empty-state"
import { Badge } from "@/components/ui/badge"
import {
  fetchComposeDeploymentAction,
  fetchComposeDeploymentsAction,
} from "@/features/compose/compose.actions"
import type {
  ComposeDeployment,
  ComposeDeploymentAction,
} from "@/features/compose/compose.entity"
import { formatDateTime } from "@/i18n/format"
import { useLocale, useTranslations } from "next-intl"
import { SectionHeader } from "@/components/custom/section-header"

const POLL_MS = 3_000

const ICON: Record<ComposeDeploymentAction, typeof Rocket> = {
  deploy: Rocket,
  stop: Square,
  start: Play,
  down: Trash2,
}

function fmt(d: string, locale: string) {
  return formatDateTime(d, locale, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

/** Seconds a run took, or how long it has been going. */
function took(run: ComposeDeployment) {
  const end = run.finishedAt ? Date.parse(run.finishedAt) : Date.now()
  return `${Math.max(0, Math.round((end - Date.parse(run.startedAt)) / 1000))}s`
}

/**
 * Every helper run of a stack: what was run, by whom (manual or a push),
 * and the output it produced. A stack is N containers, so unlike an
 * application there is no image or rollback here — only the action log.
 */
export function ComposeHistory({
  appId,
  initial,
}: {
  appId: string
  initial: ComposeDeployment[]
}) {
  const locale = useLocale()
  const t = useTranslations("compose")
  const tc = useTranslations("common")
  const [runs, setRuns] = useState(initial)
  const [openId, setOpenId] = useState<string | null>(null)
  const [logs, setLogs] = useState<string>("")
  const [, start] = useTransition()
  const busy = runs.some((r) => r.status === "running")

  useEffect(() => {
    if (!busy) return
    let cancelled = false
    const timer = setInterval(async () => {
      const next = await fetchComposeDeploymentsAction(appId)
      if (!cancelled && next.length) setRuns(next)
    }, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [busy, appId])

  const open = (id: string) =>
    start(async () => {
      if (openId === id) return setOpenId(null)
      setOpenId(id)
      setLogs("")
      const run = await fetchComposeDeploymentAction(id)
      setLogs(run?.logs || t("history.noOutput"))
    })

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t("history.section.title")}
        description={t("history.section.description", { count: runs.length })}
      />
      {runs.length === 0 ? (
        <EmptyState icon={History} compact>
          {t("history.empty")}
        </EmptyState>
      ) : (
        <DataTable minWidth="min-w-[44rem]">
          <DataTableHeader>
            <DataHead>{t("history.columns.action")}</DataHead>
            <DataHead>{t("history.columns.commit")}</DataHead>
            <DataHead>{t("history.columns.started")}</DataHead>
            <DataHead>{t("history.columns.duration")}</DataHead>
            <DataHead>{t("history.columns.status")}</DataHead>
            <DataActionsHead label={tc("labels.actions")} />
          </DataTableHeader>
          <DataTableBody>
            {runs.map((r) => {
              const Icon = ICON[r.action]
              const expanded = openId === r.id
              return (
                <Fragment key={r.id}>
                  <DataRow>
                    <DataCell className="max-w-72">
                      <div className="flex items-center gap-2">
                        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="font-medium">
                          {t(`history.action.${r.action}`)}
                        </span>
                        {r.trigger === "webhook" && (
                          <Badge
                            variant="outline"
                            title={t("history.webhookTitle")}
                          >
                            <Webhook className="size-3" /> {t("history.webhook")}
                          </Badge>
                        )}
                      </div>
                      {r.errorMessage && (
                        <p className="mt-1 text-wrap text-destructive">
                          {r.errorMessage}
                        </p>
                      )}
                    </DataCell>
                    <DataCell mono className="text-muted-foreground">
                      {r.commitSha ? r.commitSha.slice(0, 8) : "—"}
                    </DataCell>
                    <DataCell className="text-muted-foreground tabular-nums">
                      {fmt(r.startedAt, locale)}
                    </DataCell>
                    <DataCell mono className="tabular-nums">
                      {took(r)}
                    </DataCell>
                    <DataCell>
                      {r.status === "running" ? (
                        <Badge variant="secondary">
                          <Loader2 className="animate-spin" />
                          {tc("states.running")}
                        </Badge>
                      ) : r.status === "success" ? (
                        <Badge variant="default">
                          {t("history.status.success")}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          {tc("states.failed")}
                        </Badge>
                      )}
                    </DataCell>
                    <DataActions>
                      <IconButton
                        label={
                          expanded ? tc("actions.close") : t("history.log")
                        }
                        aria-expanded={expanded}
                        onClick={() => open(r.id)}
                      >
                        <ScrollText />
                      </IconButton>
                    </DataActions>
                  </DataRow>
                  {expanded && (
                    <DataDetailRow colSpan={6}>
                      <LogViewer
                        text={logs}
                        label={t("history.actionLog")}
                        empty={tc("states.loading")}
                        className="max-h-80"
                        initialFollow={false}
                      />
                    </DataDetailRow>
                  )}
                </Fragment>
              )
            })}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  )
}
