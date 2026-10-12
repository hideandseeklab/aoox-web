"use client"

import { History, Play, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { AddDialog } from "@/components/custom/add-dialog"
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
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  createJobAction,
  deleteJobAction,
  fetchJobRunsAction,
  runJobAction,
  updateJobAction,
} from "@/features/job/job.actions"
import type {
  Job,
  JobOwner,
  JobRun,
  JobRunStatus,
  JobTarget,
} from "@/features/job/job.entity"
import { formatDateTime } from "@/i18n/format"
import { useLocale, useTranslations } from "next-intl"
import { SectionHeader } from "@/components/custom/section-header"

const PRESETS: { key: string; cron: string }[] = [
  { key: "manual", cron: "off" },
  { key: "everyMinute", cron: "* * * * *" },
  { key: "every5", cron: "*/5 * * * *" },
  { key: "hourly", cron: "0 * * * *" },
  { key: "daily", cron: "0 2 * * *" },
  { key: "custom", cron: "custom" },
]

const STATUS_VARIANT: Record<
  JobRunStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  success: "default",
  running: "secondary",
  failed: "destructive",
  timeout: "destructive",
}

function fmt(d: string | null, locale: string) {
  return d
    ? formatDateTime(d, locale, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—"
}

/**
 * Cron jobs for an application: run inside the app
 * container (`docker exec`) or as a throwaway container from its image.
 */
export function ApplicationJobs({
  owner,
  jobs,
  services,
  canEdit = true,
}: {
  owner: JobOwner
  jobs: Job[]
  /** False for project viewers: jobs and their run history are read-only. */
  canEdit?: boolean
  /** Compose: service names to pick from. */
  services?: string[]
}) {
  const t = useTranslations("applications")
  const tc = useTranslations("common")
  const [service, setService] = useState(services?.[0] ?? "")
  const [name, setName] = useState("")
  const [command, setCommand] = useState("")
  const [target, setTarget] = useState<JobTarget>("container")
  const [mode, setMode] = useState("off")
  const [customCron, setCustomCron] = useState("")
  const [timeout, setTimeout_] = useState("600")
  const cron =
    mode === "custom" ? customCron.trim() : mode === "off" ? null : mode

  const reset = () => {
    setService(services?.[0] ?? "")
    setName("")
    setCommand("")
    setTarget("container")
    setMode("off")
    setCustomCron("")
    setTimeout_("600")
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t("jobs.section.title")}
        description={t("jobs.section.description", { count: jobs.length })}
        action={
          canEdit && (
            <AddDialog
              title={t("jobs.new.title")}
              description={t.rich("jobs.new.description", {
                code: (chunks) => <code>{chunks}</code>,
                b: (chunks) => <b>{chunks}</b>,
                example:
                  owner.kind === "database"
                    ? 'psql -U "$POSTGRES_USER" -c "VACUUM ANALYZE"'
                    : "php artisan schedule:run",
                extra: t(`jobs.new.extra.${owner.kind}`),
              })}
              submitLabel={t("jobs.new.add")}
              onOpenChange={reset}
              onSubmit={() =>
                createJobAction(owner, {
                  name: name.trim(),
                  cron,
                  command,
                  target,
                  enabled: true,
                  timeoutSeconds: Math.max(1, Number(timeout) || 600),
                  ...(owner.kind === "compose" ? { service } : {}),
                })
              }
            >
              <div className="space-y-1">
                <Label htmlFor="job-name">{tc("labels.name")}</Label>
                <Input
                  id="job-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Scheduler Laravel"
                  required
                />
              </div>
              {owner.kind === "compose" && (
                <div className="space-y-1">
                  <Label htmlFor="job-service">{t("jobs.new.service")}</Label>
                  <Select value={service} onValueChange={setService}>
                    <SelectTrigger id="job-service" className="w-full">
                      <SelectValue placeholder={t("jobs.new.deployFirst")} />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {(services ?? []).map((sv) => (
                        <SelectItem key={sv} value={sv}>
                          {sv}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="job-target">{t("jobs.new.run")}</Label>
                <Select
                  value={target}
                  onValueChange={(v) => setTarget(v as JobTarget)}
                >
                  <SelectTrigger id="job-target" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="container">
                      {t("jobs.new.targetContainer")}
                    </SelectItem>
                    <SelectItem value="run">
                      {t("jobs.new.targetRun")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="job-cmd">{t("jobs.new.command")}</Label>
                <Textarea
                  id="job-cmd"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  rows={2}
                  spellCheck={false}
                  className="font-mono text-xs"
                  placeholder="php artisan schedule:run"
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="job-preset">{t("jobs.new.schedule")}</Label>
                  <Select value={mode} onValueChange={setMode}>
                    <SelectTrigger id="job-preset" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {PRESETS.map((p) => (
                        <SelectItem key={p.cron} value={p.cron}>
                          {t(`jobs.preset.${p.key}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {mode === "custom" && (
                  <div className="space-y-1">
                    <Label htmlFor="job-cron">{t("jobs.new.cron")}</Label>
                    <Input
                      id="job-cron"
                      value={customCron}
                      onChange={(e) => setCustomCron(e.target.value)}
                      placeholder="30 1 * * *"
                      className="font-mono"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="job-timeout">{t("jobs.new.timeout")}</Label>
                  <Input
                    id="job-timeout"
                    type="number"
                    min={1}
                    max={86400}
                    value={timeout}
                    onChange={(e) => setTimeout_(e.target.value)}
                  />
                </div>
              </div>
            </AddDialog>
          )
        }
      />
      {jobs.length === 0 ? (
        <EmptyState icon={History} compact>
          {t("jobs.empty")}
        </EmptyState>
      ) : (
        <DataTable minWidth="min-w-[52rem]">
          <DataTableHeader>
            <DataHead>{t("jobs.columns.name")}</DataHead>
            <DataHead>{t("jobs.columns.schedule")}</DataHead>
            <DataHead>{t("jobs.columns.runIn")}</DataHead>
            <DataHead>{t("jobs.columns.lastRun")}</DataHead>
            <DataHead>{t("jobs.columns.active")}</DataHead>
            <DataActionsHead label={tc("labels.actions")} />
          </DataTableHeader>
          <DataTableBody>
            {jobs.map((j) => (
              <JobRow key={j.id} owner={owner} job={j} canEdit={canEdit} />
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  )
}

function JobRow({
  owner,
  job,
  canEdit,
}: {
  owner: JobOwner
  job: Job
  canEdit: boolean
}) {
  const t = useTranslations("applications")
  const tc = useTranslations("common")
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [runs, setRuns] = useState<JobRun[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const running = runs?.some((r) => r.status === "running") ?? false

  const router = useRouter()
  const wasRunning = useRef(false)

  const load = useCallback(async () => {
    const next = await fetchJobRunsAction(job.id)
    if (!next) return
    setRuns(next)
    const nowRunning = next.some((r) => r.status === "running")
    // A run just finished: refresh the server-rendered header (last status/time).
    if (wasRunning.current && !nowRunning) router.refresh()
    wasRunning.current = nowRunning
  }, [job.id, router])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) void load()
  }

  // Poll while a run is in progress (setState happens in the timer, not the effect body).
  useEffect(() => {
    if (!open || !running) return
    const t = setInterval(() => void load(), 2000)
    return () => clearInterval(t)
  }, [open, running, load])

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? tc("states.failed"))
    })

  return (
    <>
      <DataRow>
        <DataCell className="max-w-72">
          <div className="truncate font-medium">{job.name}</div>
          <div
            className="truncate font-mono text-muted-foreground"
            title={job.command}
          >
            {job.command}
          </div>
          {error && (
            <p className="mt-1 text-wrap text-destructive" role="alert">
              {error}
            </p>
          )}
        </DataCell>
        <DataCell mono>
          {job.cron ?? (
            <span className="font-sans text-muted-foreground">
              {t("jobs.row.manual")}
            </span>
          )}
        </DataCell>
        <DataCell>
          <div>
            {job.target === "container"
              ? t("jobs.row.inContainer")
              : t("jobs.row.separate")}
          </div>
          <div className="text-muted-foreground">
            {t("jobs.row.timeout", { seconds: job.timeoutSeconds })}
          </div>
        </DataCell>
        <DataCell>
          <div className="flex items-center gap-2">
            {job.lastStatus && (
              <Badge variant={STATUS_VARIANT[job.lastStatus]}>
                {job.lastStatus}
              </Badge>
            )}
            <span className="text-muted-foreground tabular-nums">
              {job.lastRunAt ? fmt(job.lastRunAt, locale) : tc("states.never")}
            </span>
          </div>
        </DataCell>
        <DataCell>
          <Switch
            checked={job.enabled}
            disabled={pending || !canEdit}
            aria-label={t("jobs.row.active")}
            onCheckedChange={(enabled) =>
              act(() => updateJobAction(owner, job.id, { enabled }))
            }
          />
        </DataCell>
        <DataActions>
          <IconButton
            label={
              open ? t("jobs.row.closeHistory") : t("jobs.row.openHistory")
            }
            aria-expanded={open}
            onClick={toggle}
          >
            <History />
          </IconButton>
          {canEdit && (
            <IconButton
              label={t("jobs.row.runNow")}
              disabled={pending || running}
              onClick={() =>
                act(async () => {
                  const r = await runJobAction(job.id)
                  if (r.ok) {
                    setOpen(true)
                    await load()
                  }
                  return r
                })
              }
            >
              <Play />
            </IconButton>
          )}
          {canEdit && (
            <ConfirmDialog
              trigger={
                <IconButton label={t("jobs.row.deleteAria")} disabled={pending}>
                  <Trash2 />
                </IconButton>
              }
              title={t("jobs.row.deleteTitle", { name: job.name })}
              description={t("jobs.row.deleteDescription")}
              confirmLabel={tc("actions.delete")}
              onConfirm={() => deleteJobAction(owner, job.id)}
            />
          )}
        </DataActions>
      </DataRow>
      {open && (
        <DataDetailRow colSpan={6}>
          {runs === null ? (
            <p className="text-xs text-muted-foreground">
              {tc("states.loading")}
            </p>
          ) : runs.length === 0 ? (
            <EmptyState icon={History} compact>
              {t("jobs.row.neverRun")}
            </EmptyState>
          ) : (
            <ul className="divide-y rounded-md border bg-card text-xs">
              {runs.map((r) => (
                <RunRow key={r.id} run={r} />
              ))}
            </ul>
          )}
        </DataDetailRow>
      )}
    </>
  )
}

function RunRow({ run }: { run: JobRun }) {
  const t = useTranslations("applications")
  const tc = useTranslations("common")
  const locale = useLocale()
  const [show, setShow] = useState(false)
  return (
    <li className="px-3 py-2">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 text-xs text-muted-foreground">
          {fmt(run.startedAt, locale)} ·{" "}
          {run.trigger === "scheduled"
            ? t("jobs.run.scheduled")
            : t("jobs.row.manual")}
          {run.exitCode !== null && ` · exit ${run.exitCode}`}
        </span>
        <Badge variant={STATUS_VARIANT[run.status]}>{run.status}</Badge>
        <Button size="sm" variant="ghost" onClick={() => setShow((s) => !s)}>
          {show ? tc("actions.hide") : t("jobs.run.output")}
        </Button>
      </div>
      {show && (
        <div className="mt-2">
          <LogViewer
            text={run.output ?? ""}
            label={t("jobs.run.outputLabel")}
            empty={t("jobs.run.noOutput")}
            className="max-h-72"
            initialFollow={false}
          />
        </div>
      )}
    </li>
  )
}
