"use client"

import { ChevronDown, ChevronRight, Play, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
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

const PRESETS: { label: string; cron: string }[] = [
  { label: "Manual saja", cron: "off" },
  { label: "Setiap menit", cron: "* * * * *" },
  { label: "Setiap 5 menit", cron: "*/5 * * * *" },
  { label: "Setiap jam", cron: "0 * * * *" },
  { label: "Setiap hari 02:00", cron: "0 2 * * *" },
  { label: "Kustom", cron: "custom" },
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

function fmt(d: string | null) {
  return d
    ? new Date(d).toLocaleString("id-ID", {
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
}: {
  owner: JobOwner
  jobs: Job[]
  /** Compose: service names to pick from. */
  services?: string[]
}) {
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
      {jobs.map((j) => (
        <JobRow key={j.id} owner={owner} job={j} />
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Job baru</CardTitle>
          <CardDescription>
            Perintah dijalankan dengan <code>sh -c</code>. <b>Di container</b>:{" "}
            <code>docker exec</code> di container yang berjalan (mis.{" "}
            {owner.kind === "database" ? (
              <code>
                psql -U &quot;$POSTGRES_USER&quot; -c &quot;VACUUM ANALYZE&quot;
              </code>
            ) : (
              <code>php artisan schedule:run</code>
            )}
            ). <b>Container terpisah</b>: container sekali-jalan dari image yang
            sama
            {owner.kind === "database"
              ? " dengan env DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME"
              : owner.kind === "application"
                ? " beserta env dan mount aplikasi"
                : " beserta env service"}{" "}
            — untuk pekerjaan berat atau saat container berhenti. Job yang masih
            berjalan tidak dijalankan ganda.
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
                <Label htmlFor="job-name">Nama</Label>
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
                  <Label htmlFor="job-service">Service</Label>
                  <Select value={service} onValueChange={setService}>
                    <SelectTrigger id="job-service">
                      <SelectValue placeholder="Deploy stack dulu" />
                    </SelectTrigger>
                    <SelectContent>
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
                <Label htmlFor="job-target">Jalankan</Label>
                <Select
                  value={target}
                  onValueChange={(v) => setTarget(v as JobTarget)}
                >
                  <SelectTrigger id="job-target">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="container">
                      Di container aplikasi
                    </SelectItem>
                    <SelectItem value="run">Container terpisah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="job-cmd">Perintah</Label>
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
                <Label htmlFor="job-preset">Jadwal</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger id="job-preset" className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESETS.map((p) => (
                      <SelectItem key={p.cron} value={p.cron}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {mode === "custom" && (
                <div className="space-y-1">
                  <Label htmlFor="job-cron">Cron (5 kolom)</Label>
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
                <Label htmlFor="job-timeout">Timeout (detik)</Label>
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
                {pending ? "Menyimpan…" : "Tambah job"}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function JobRow({ owner, job }: { owner: JobOwner; job: Job }) {
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
      if (!r.ok) setError(r.error ?? "Gagal")
    })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={open ? "Tutup riwayat" : "Buka riwayat"}
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
              {job.cron ? <code>{job.cron}</code> : "manual"} ·{" "}
              {job.target === "container"
                ? "di container"
                : "container terpisah"}{" "}
              · timeout {job.timeoutSeconds}s · terakhir {fmt(job.lastRunAt)}
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
              disabled={pending}
              onCheckedChange={(enabled) =>
                act(() => updateJobAction(owner, job.id, { enabled }))
              }
            />
            aktif
          </label>
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
            Jalankan
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Hapus job"
            disabled={pending}
            onClick={() => {
              if (!confirm(`Hapus job "${job.name}"?`)) return
              act(() => deleteJobAction(owner, job.id))
            }}
          >
            <Trash2 />
          </Button>
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardHeader>
      {open && (
        <CardContent>
          {runs === null ? (
            <p className="text-sm text-muted-foreground">Memuat…</p>
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum pernah dijalankan.
            </p>
          ) : (
            <ul className="divide-y rounded-md border text-sm">
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
  const [show, setShow] = useState(false)
  return (
    <li className="px-3 py-2">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 text-xs text-muted-foreground">
          {fmt(run.startedAt)} ·{" "}
          {run.trigger === "scheduled" ? "terjadwal" : "manual"}
          {run.exitCode !== null && ` · exit ${run.exitCode}`}
        </span>
        <Badge variant={STATUS_VARIANT[run.status]}>{run.status}</Badge>
        <Button size="sm" variant="ghost" onClick={() => setShow((s) => !s)}>
          {show ? "Sembunyikan" : "Output"}
        </Button>
      </div>
      {show && (
        <pre className="mt-2 max-h-72 overflow-auto rounded bg-muted p-2 font-mono text-xs whitespace-pre-wrap">
          {run.output || "(tidak ada output)"}
        </pre>
      )}
    </li>
  )
}
