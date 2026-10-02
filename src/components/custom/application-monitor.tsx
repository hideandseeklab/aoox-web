"use client"

import { Activity, Loader2 } from "lucide-react"
import { PathArrow } from "@/components/custom/arrows"
import { useId, useRef, useState, useSyncExternalStore } from "react"
import { toast } from "sonner"
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
import {
  INTERVAL_OPTIONS,
  THRESHOLD_OPTIONS,
  TIMEOUT_OPTIONS,
  type HttpMonitorConfig,
  type HttpMonitorState,
  type HttpMonitorTargetSource,
  type HttpMonitorView,
} from "@/features/http-monitor/http-monitor.entity"
import {
  checkHttpMonitorAction,
  saveHttpMonitorAction,
} from "@/features/http-monitor/http-monitor.actions"

const SOURCE_LABEL: Record<HttpMonitorTargetSource, string> = {
  domain: "domain (lewat proxy)",
  hostPort: "port host",
  container: "nama container (jaringan aoox)",
}

const STATE_LABEL: Record<HttpMonitorState, string> = {
  up: "sehat",
  down: "down",
  unknown: "belum dicek",
}

/** Locale/timezone differ between server and browser: format dates only after mount. */
function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  )
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} dtk`
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m} mnt`
  return `${Math.floor(m / 60)} j ${m % 60} mnt`
}

const pct = (v: number | null) => (v === null ? "–" : `${v}%`)
const ms = (v: number | null) => (v === null ? "–" : `${v} ms`)

/**
 * The Monitor tab: optional HTTP check of the application. Developers and up
 * edit; viewers only read (the API enforces it too). The host is never typed
 * here — it is derived from the application and shown read-only, so the panel
 * cannot be pointed at arbitrary addresses.
 */
export function ApplicationMonitor({
  applicationId,
  initial,
  canEdit,
  running,
}: {
  applicationId: string
  initial: HttpMonitorView
  canEdit: boolean
  running: boolean
}) {
  const mounted = useMounted()
  const [view, setView] = useState(initial)
  const [form, setForm] = useState<HttpMonitorConfig>(initial.config)
  const [busy, setBusy] = useState<"save" | "check" | "toggle" | null>(null)
  const toastId = useRef<string | number | null>(null)
  const ids = {
    path: useId(),
    interval: useId(),
    timeout: useId(),
    codes: useId(),
    threshold: useId(),
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(view.config) && canEdit
  const when = (iso: string | null) =>
    iso && mounted
      ? new Date(iso).toLocaleString("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "–"

  async function run(
    kind: "save" | "check" | "toggle",
    work: () => ReturnType<typeof saveHttpMonitorAction>,
    messages: { loading: string; success: string }
  ) {
    setBusy(kind)
    toastId.current = toast.loading(messages.loading)
    const r = await work()
    if (r.ok) {
      setView(r.data)
      setForm(r.data.config)
      toast.success(messages.success, { id: toastId.current })
    } else {
      toast.error(r.error, { id: toastId.current })
    }
    setBusy(null)
  }

  const save = () =>
    run("save", () => saveHttpMonitorAction(applicationId, form), {
      loading: "Menyimpan monitor…",
      success: "Monitor disimpan",
    })
  const toggle = (enabled: boolean) =>
    run(
      "toggle",
      () => saveHttpMonitorAction(applicationId, { ...form, enabled }),
      {
        loading: enabled ? "Mengaktifkan monitor…" : "Menonaktifkan monitor…",
        success: enabled ? "Monitor aktif" : "Monitor nonaktif",
      }
    )
  const checkNow = () =>
    run("check", () => checkHttpMonitorAction(applicationId), {
      loading: "Memeriksa…",
      success: "Pemeriksaan selesai",
    })

  const enabled = view.config.enabled
  const state = enabled ? view.status.state : "unknown"

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2">
              <Activity className="size-4" aria-hidden="true" />
              Monitor HTTP
              <Badge
                variant={
                  !enabled
                    ? "outline"
                    : state === "up"
                      ? "default"
                      : state === "down"
                        ? "destructive"
                        : "secondary"
                }
              >
                {enabled ? STATE_LABEL[state] : "nonaktif"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Memeriksa aplikasi lewat HTTP secara berkala dan mengirim
              notifikasi bila gagal beberapa kali berturut-turut. Aplikasi yang
              container-nya hidup tapi mengembalikan 5xx atau macet terdeteksi
              di sini.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor={`${ids.path}-enabled`} className="text-xs">
              Aktif
            </Label>
            <Switch
              id={`${ids.path}-enabled`}
              checked={form.enabled}
              disabled={!canEdit || busy !== null}
              onCheckedChange={(v) => void toggle(v)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Target (diturunkan dari aplikasi, tidak bisa diubah)
          </p>
          {view.target ? (
            <p className="font-mono text-xs break-all">
              {view.target.url}{" "}
              <span className="font-sans text-muted-foreground">
                · {SOURCE_LABEL[view.target.source]}
              </span>
            </p>
          ) : (
            <p className="text-xs text-destructive">
              {view.targetError ?? "Belum ada alamat"}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Pemeriksaan dijalankan dari mesin panel: tidak membuktikan aplikasi
            bisa dijangkau dari internet luar. Dengan domain publik, hasilnya
            bisa terpengaruh hairpin NAT.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={ids.path}>Path</Label>
            <Input
              id={ids.path}
              value={form.path}
              disabled={!canEdit}
              onChange={(e) => setForm({ ...form, path: e.target.value })}
              placeholder="/health"
              className="font-mono text-xs"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={ids.codes}>Status sehat</Label>
            <Input
              id={ids.codes}
              value={form.expectedCodes}
              disabled={!canEdit}
              onChange={(e) =>
                setForm({ ...form, expectedCodes: e.target.value })
              }
              placeholder="200-399"
              className="font-mono text-xs"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={ids.interval}>Interval</Label>
            <Select
              value={String(form.intervalMinutes)}
              disabled={!canEdit}
              onValueChange={(v) =>
                setForm({ ...form, intervalMinutes: Number(v) })
              }
            >
              <SelectTrigger id={ids.interval} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVAL_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} menit
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={ids.timeout}>Batas waktu</Label>
            <Select
              value={String(form.timeoutSeconds)}
              disabled={!canEdit}
              onValueChange={(v) =>
                setForm({ ...form, timeoutSeconds: Number(v) })
              }
            >
              <SelectTrigger id={ids.timeout} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEOUT_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} detik
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={ids.threshold}>Gagal berturut-turut</Label>
            <Select
              value={String(form.failureThreshold)}
              disabled={!canEdit}
              onValueChange={(v) =>
                setForm({ ...form, failureThreshold: Number(v) })
              }
            >
              <SelectTrigger id={ids.threshold} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THRESHOLD_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}× sebelum alert
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Switch
              id={`${ids.path}-internal`}
              checked={form.useInternal}
              disabled={!canEdit}
              onCheckedChange={(v) => setForm({ ...form, useInternal: v })}
            />
            <Label htmlFor={`${ids.path}-internal`} className="text-xs">
              Periksa lewat alamat internal (lewati domain publik)
            </Label>
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => void save()}
              disabled={!dirty || busy !== null}
            >
              {busy === "save" && (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              )}
              Simpan
            </Button>
            <Button
              variant="outline"
              onClick={() => void checkNow()}
              disabled={busy !== null || !running || dirty}
              title={
                !running
                  ? "Aplikasi harus berjalan"
                  : dirty
                    ? "Simpan perubahan dulu"
                    : undefined
              }
            >
              {busy === "check" && (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              )}
              Periksa sekarang
            </Button>
          </div>
        )}

        {enabled && (
          <>
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Terakhir dicek"
                value={when(view.status.lastCheckedAt)}
              />
              <Stat
                label="Hasil terakhir"
                value={
                  view.status.lastError
                    ? view.status.lastError
                    : view.status.lastStatusCode
                      ? `HTTP ${view.status.lastStatusCode} · ${ms(view.status.lastLatencyMs)}`
                      : "–"
                }
                danger={!!view.status.lastError}
              />
              <Stat label="Uptime 24 jam" value={pct(view.stats.uptime24h)} />
              <Stat label="Uptime 7 hari" value={pct(view.stats.uptime7d)} />
              <Stat
                label="Latensi rata-rata (24 jam)"
                value={ms(view.stats.avgLatencyMs24h)}
              />
              <Stat
                label="Latensi p95 (24 jam)"
                value={ms(view.stats.p95LatencyMs24h)}
              />
              <Stat
                label="Pemeriksaan (24 jam)"
                value={String(view.stats.checks24h)}
              />
              {state === "down" && (
                <Stat
                  label="Down sejak"
                  value={when(view.status.since)}
                  danger
                />
              )}
            </dl>
            <LatencySeries series={view.series} />
          </>
        )}

        {view.incidents.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium">Kejadian down terakhir</h3>
            <ul className="divide-y rounded-md border">
              {view.incidents.map((i) => (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs"
                >
                  <Badge variant={i.endedAt ? "secondary" : "destructive"}>
                    {i.endedAt ? "selesai" : "berlangsung"}
                  </Badge>
                  <span className="tabular-nums">{when(i.startedAt)}</span>
                  <span className="text-muted-foreground">
                    {i.endedAt ? (
                      <>
                        <PathArrow />
                        {when(i.endedAt)} ·{" "}
                      </>
                    ) : (
                      "· "
                    )}
                    {formatDuration(i.durationSeconds)}
                  </span>
                  {i.reason && (
                    <span className="truncate font-mono text-muted-foreground">
                      {i.reason}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({
  label,
  value,
  danger = false,
}: {
  label: string
  value: string
  danger?: boolean
}) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={
          danger
            ? "truncate text-xs font-medium text-destructive"
            : "truncate text-xs font-medium tabular-nums"
        }
        title={value}
      >
        {value}
      </dd>
    </div>
  )
}

const W = 600
const H = 56

/**
 * Latency over the last 24 h (≤ 120 buckets). The line is the average of the
 * healthy checks of each bucket; a bucket with failures gets a red tick at
 * the bottom, so outages show even where there is no latency to draw.
 */
function LatencySeries({ series }: { series: HttpMonitorView["series"] }) {
  const [hover, setHover] = useState<number | null>(null)
  const mounted = useMounted()
  if (series.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Belum ada data — pemeriksaan pertama berjalan dalam semenit.
      </p>
    )
  }
  const values = series.map((s) => s.latencyMs)
  const max = Math.max(...values.map((v) => v ?? 0), 1)
  const step = W / Math.max(series.length - 1, 1)
  const x = (i: number) => i * step
  const y = (v: number) => H - 6 - (v / max) * (H - 12)
  let d = ""
  values.forEach((v, i) => {
    if (v === null) return
    d += `${d && values[i - 1] !== null ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `
  })
  const i = hover ?? series.length - 1
  const s = series[i]
  const label =
    `${s.latencyMs === null ? "tanpa respons sehat" : `${s.latencyMs} ms`}` +
    (s.failures > 0 ? ` · ${s.failures}/${s.checks} gagal` : "") +
    (mounted ? ` · ${new Date(s.at).toLocaleTimeString()}` : "")
  return (
    <div className="space-y-0.5">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-14 w-full"
        role="img"
        aria-label={`Latensi 24 jam terakhir, terakhir ${s.latencyMs ?? "tanpa respons"} ms`}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const px = ((e.clientX - rect.left) / rect.width) * W
          setHover(
            Math.min(series.length - 1, Math.max(0, Math.round(px / step)))
          )
        }}
        onMouseLeave={() => setHover(null)}
      >
        {d && (
          <path
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            className="text-muted-foreground"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {series.map(
          (p, idx) =>
            p.failures > 0 && (
              <line
                key={p.at}
                x1={x(idx)}
                x2={x(idx)}
                y1={H - 8}
                y2={H}
                stroke="currentColor"
                strokeWidth={3}
                className="text-destructive"
                vectorEffect="non-scaling-stroke"
              />
            )
        )}
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={0}
            y2={H}
            stroke="currentColor"
            strokeWidth={1}
            className="text-border"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <p className="text-[11px] text-muted-foreground tabular-nums">{label}</p>
    </div>
  )
}
