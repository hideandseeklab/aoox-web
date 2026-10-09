"use client"

import { Activity, Loader2 } from "lucide-react"
import { PathArrow } from "@/components/custom/arrows"
import { useId, useRef, useState, useSyncExternalStore } from "react"
import { toast } from "sonner"
import { AreaChart } from "@/components/custom/area-chart"
import { EmptyState } from "@/components/custom/empty-state"
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
  type HttpMonitorView,
} from "@/features/http-monitor/http-monitor.entity"
import {
  checkHttpMonitorAction,
  saveHttpMonitorAction,
} from "@/features/http-monitor/http-monitor.actions"
import { formatDateTime } from "@/i18n/format"
import { useLocale, useTranslations } from "next-intl"

/** Locale/timezone differ between server and browser: format dates only after mount. */
function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  )
}

type Translator = (key: string, values?: Record<string, string | number>) => string

function formatDuration(seconds: number, t: Translator): string {
  if (seconds < 60) return t("monitor.duration.seconds", { n: seconds })
  const m = Math.round(seconds / 60)
  if (m < 60) return t("monitor.duration.minutes", { n: m })
  return t("monitor.duration.hoursMinutes", { h: Math.floor(m / 60), m: m % 60 })
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
  const t = useTranslations("applications")
  const tc = useTranslations("common")
  const locale = useLocale()
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
      ? formatDateTime(iso, locale, {
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
      loading: t("monitor.toast.saving"),
      success: t("monitor.toast.saved"),
    })
  const toggle = (enabled: boolean) =>
    run(
      "toggle",
      () => saveHttpMonitorAction(applicationId, { ...form, enabled }),
      {
        loading: enabled
          ? t("monitor.toast.enabling")
          : t("monitor.toast.disabling"),
        success: enabled
          ? t("monitor.toast.enabled")
          : t("monitor.toast.disabled"),
      }
    )
  const checkNow = () =>
    run("check", () => checkHttpMonitorAction(applicationId), {
      loading: t("monitor.toast.checking"),
      success: t("monitor.toast.checked"),
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
              {t("monitor.title")}
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
                {enabled ? t(`monitor.state.${state}`) : t("monitor.state.disabled")}
              </Badge>
            </CardTitle>
            <CardDescription>{t("monitor.description")}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor={`${ids.path}-enabled`} className="text-xs">
              {t("monitor.active")}
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
      <CardContent className="space-y-5 text-xs">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {t("monitor.target.label")}
          </p>
          {view.target ? (
            <p className="font-mono text-xs break-all">
              {view.target.url}{" "}
              <span className="font-sans text-muted-foreground">
                · {t(`monitor.target.source.${view.target.source}`)}
              </span>
            </p>
          ) : (
            <p className="text-xs text-destructive">
              {view.targetError ?? t("monitor.target.none")}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {t("monitor.target.note")}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={ids.path}>{t("monitor.fields.path")}</Label>
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
            <Label htmlFor={ids.codes}>{t("monitor.fields.healthyCodes")}</Label>
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
            <Label htmlFor={ids.interval}>{t("monitor.fields.interval")}</Label>
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
                    {t("monitor.fields.minutes", { n })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={ids.timeout}>{t("monitor.fields.timeout")}</Label>
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
                    {t("monitor.fields.seconds", { n })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={ids.threshold}>{t("monitor.fields.threshold")}</Label>
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
                    {t("monitor.fields.beforeAlert", { n })}
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
              {t("monitor.fields.useInternal")}
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
              {tc("actions.save")}
            </Button>
            <Button
              variant="outline"
              onClick={() => void checkNow()}
              disabled={busy !== null || !running || dirty}
              title={
                !running
                  ? t("monitor.mustRun")
                  : dirty
                    ? t("monitor.saveFirst")
                    : undefined
              }
            >
              {busy === "check" && (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              )}
              {t("monitor.checkNow")}
            </Button>
          </div>
        )}

        {enabled && (
          <>
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label={t("monitor.stats.lastChecked")}
                value={when(view.status.lastCheckedAt)}
              />
              <Stat
                label={t("monitor.stats.lastResult")}
                value={
                  view.status.lastError
                    ? view.status.lastError
                    : view.status.lastStatusCode
                      ? `HTTP ${view.status.lastStatusCode} · ${ms(view.status.lastLatencyMs)}`
                      : "–"
                }
                danger={!!view.status.lastError}
              />
              <Stat label={t("monitor.stats.uptime24h")} value={pct(view.stats.uptime24h)} />
              <Stat label={t("monitor.stats.uptime7d")} value={pct(view.stats.uptime7d)} />
              <Stat
                label={t("monitor.stats.avgLatency")}
                value={ms(view.stats.avgLatencyMs24h)}
              />
              <Stat
                label={t("monitor.stats.p95Latency")}
                value={ms(view.stats.p95LatencyMs24h)}
              />
              <Stat
                label={t("monitor.stats.checks24h")}
                value={String(view.stats.checks24h)}
              />
              {state === "down" && (
                <Stat
                  label={t("monitor.stats.downSince")}
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
            <h3 className="text-xs font-medium">{t("monitor.incidents.title")}</h3>
            <ul className="divide-y rounded-md border">
              {view.incidents.map((i) => (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs"
                >
                  <Badge variant={i.endedAt ? "secondary" : "destructive"}>
                    {i.endedAt ? t("monitor.incidents.done") : t("monitor.incidents.ongoing")}
                  </Badge>
                  <span className="tabular-nums">{when(i.startedAt)}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {i.endedAt ? (
                      <>
                        <PathArrow />
                        {when(i.endedAt)} ·{" "}
                      </>
                    ) : (
                      "· "
                    )}
                    {formatDuration(i.durationSeconds, t)}
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

/**
 * Latency over the last 24 h (≤ 120 buckets). The line is the average of the
 * healthy checks of each bucket; a bucket with failures gets a red tick at
 * the bottom, so outages show even where there is no latency to draw.
 */
function LatencySeries({ series }: { series: HttpMonitorView["series"] }) {
  const t = useTranslations("applications")
  if (series.length === 0) {
    return (
      <EmptyState icon={Activity} compact>
        {t("monitor.series.empty")}
      </EmptyState>
    )
  }
  const last = series[series.length - 1]
  return (
    <AreaChart
      points={series.map((s) => ({ value: s.latencyMs, at: s.at }))}
      format={(v) => `${Math.round(v)} ms`}
      describe={(i) => {
        const s = series[i]
        return (
          (s.latencyMs === null
            ? t("monitor.series.noHealthy")
            : `${s.latencyMs} ms`) +
          (s.failures > 0
            ? ` · ${t("monitor.series.failed", { failures: s.failures, checks: s.checks })}`
            : "")
        )
      }}
      marks={series.flatMap((s, i) => (s.failures > 0 ? [i] : []))}
      height={64}
      ariaLabel={t("monitor.series.aria", {
        value: last.latencyMs ?? t("monitor.series.noResponse"),
      })}
    />
  )
}
