"use client"

import { ChevronDown, ChevronRight, History, Play, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { LogViewer } from "@/components/custom/log-viewer"
import { EmptyState } from "@/components/custom/empty-state"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const cron =
    mode === "custom" ? customCron.trim() : mode === "off" ? null : mode

  return (
    <div className="space-y-4">
      {jobs.length === 0 && (
        <EmptyState icon={History} compact>
          {t("jobs.empty")}
        </EmptyState>
      )}
      {jobs.map((j) => (
        <JobRow key={j.id} owner={owner} job={j} canEdit={canEdit} />
      ))}

      {canEdit && (
      <Card>
        <CardHeader>
          <CardTitle>{t("jobs.new.title")}</CardTitle>
          <CardDescription>
            {t.rich("jobs.new.description", {
              code: (chunks) => <code>{chunks}</code>,
              b: (chunks) => <b>{chunks}</b>,
              example:
                owner.kind === "database"
                  ? 'psql -U "$POSTGRES_USER" -c "VACUUM ANALYZE"'
                  : "php artisan schedule:run",
              extra: t(`jobs.new.extra.${owner.kind}`),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              start(async () => {
                setError(null)
                const r = await createJobAction(owner, {
                  name: name.trim(),
                  cron,
                  command,
                  target,
                  enabled: true,
                  timeoutSeconds: Math.max(1, Number(timeout) || 600),
                  ...(owner.kind === "compose" ? { service } : {}),
                })
                if (!r.ok) setError(r.error)
                else {
                  setName("")
                  setCommand("")
                }
              })
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
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
                    <SelectTrigger id="job-service">
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
                  <SelectTrigger id="job-target">
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
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="job-preset">{t("jobs.new.schedule")}</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger id="job-preset" className="w-48">
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
                    className="w-40 font-mono"
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
                  className="w-28"
                />
              </div>
              <span className="flex-1" />
              <Button type="submit" disabled={pending}>
                <Plus data-icon="inline-start" />
                {pending ? tc("states.saving") : t("jobs.new.add")}
              </Button>
            </div>
            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={open ? t("jobs.row.closeHistory") : t("jobs.row.openHistory")}
            onClick={toggle}
          >
            {open ? <ChevronDown /> : <ChevronRight />}
          </Button>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate">{job.name}</CardTitle>
            <CardDescription className="truncate font-mono text-xs">
              {job.command}
            </CardDescription>
            <CardDescription className="text-xs">
              {job.cron ? <code>{job.cron}</code> : t("jobs.row.manual")} ·{" "}
              {job.target === "container"
                ? t("jobs.row.inContainer")
                : t("jobs.row.separate")}{" "}
              · {t("jobs.row.timeout", { seconds: job.timeoutSeconds })} ·{" "}
              {t("jobs.row.last", { when: fmt(job.lastRunAt, locale) })}
            </CardDescription>
          </div>
          {job.lastStatus && (
            <Badge variant={STATUS_VARIANT[job.lastStatus]}>
              {job.lastStatus}
            </Badge>
          )}
          <label className="flex items-center gap-2 text-xs">
            <Switch
              checked={job.enabled}
              disabled={pending || !canEdit}
              onCheckedChange={(enabled) =>
                act(() => updateJobAction(owner, job.id, { enabled }))
              }
            />
            {t("jobs.row.active")}
          </label>
          {canEdit && (
          <Button
            size="sm"
            variant="outline"
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
            <Play data-icon="inline-start" />
            {t("jobs.row.runNow")}
          </Button>
          )}
          {canEdit && (
          <ConfirmDialog
            trigger={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("jobs.row.deleteAria")}
                disabled={pending}
              >
                <Trash2 />
              </Button>
            }
            title={t("jobs.row.deleteTitle", { name: job.name })}
            description={t("jobs.row.deleteDescription")}
            confirmLabel={tc("actions.delete")}
            onConfirm={() => deleteJobAction(owner, job.id)}
          />
          )}
        </div>
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardHeader>
      {open && (
        <CardContent>
          {runs === null ? (
            <p className="text-xs text-muted-foreground">
              {tc("states.loading")}
            </p>
          ) : runs.length === 0 ? (
            <EmptyState icon={History} compact>
              {t("jobs.row.neverRun")}
            </EmptyState>
          ) : (
            <ul className="divide-y rounded-md border text-xs">
              {runs.map((r) => (
                <RunRow key={r.id} run={r} />
              ))}
            </ul>
          )}
        </CardContent>
      )}
    </Card>
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
