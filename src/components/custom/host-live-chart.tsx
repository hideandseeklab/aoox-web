"use client"

import { useTranslations } from "next-intl"
import { useEffect, useState, useSyncExternalStore } from "react"
import { AreaChart } from "@/components/custom/area-chart"
import { Card, CardContent } from "@/components/ui/card"
import { fetchHostLiveAction } from "@/features/monitoring/monitoring.actions"
import {
  formatBytes,
  type HostLiveMetrics,
  type HostSample,
} from "@/features/monitoring/monitoring.entity"

/** Matches the API host sampler (2 s). */
const POLL_MS = 2_000
/** Points the chart shows (API keeps 150 = 5 min). */
const POINTS = 150

/**
 * Live host CPU, RAM and storage for the dashboard, below the host card:
 * three single-series area charts (side by side on wide screens, stacked on
 * narrow ones), each stretched to its card, on a fixed 0–100 % scale,
 * scrolling left as samples arrive. Polls only while
 * the tab is visible so an abandoned dashboard costs nothing.
 */
export function HostLiveChart({ initial }: { initial: HostLiveMetrics }) {
  const t = useTranslations("dashboard.live")
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
      const next = await fetchHostLiveAction()
      if (!cancelled && next) setData(next)
    }
    const timer = setInterval(() => void tick(), POLL_MS)
    void tick()
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [visible])

  const cur = data.current
  if (!cur) {
    return (
      <p className="text-xs text-muted-foreground">
        {t("waiting")}
      </p>
    )
  }
  const history = data.history.slice(-POINTS)
  const memPct = (p: HostSample) =>
    p.memoryTotalBytes > 0 ? (p.memoryUsedBytes / p.memoryTotalBytes) * 100 : 0
  const managedMemPct =
    cur.memoryTotalBytes > 0
      ? (data.managed.memoryBytes / cur.memoryTotalBytes) * 100
      : 0
  // Container CPU % is "of one core"; the host chart is "of all cores".
  const managedCpuPct = data.cpus > 0 ? data.managed.cpuPercent / data.cpus : 0
  const diskPct = (p: HostSample) =>
    p.diskTotalBytes > 0 ? (p.diskUsedBytes / p.diskTotalBytes) * 100 : 0

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <LiveTile
        label={t("cpu")}
        value={cur.cpuPercent === null ? "–" : `${cur.cpuPercent.toFixed(0)}%`}
        hint={t(cur.load1 ? "cpuHintLoad" : "cpuHint", {
          cpus: data.cpus,
          load: cur.load1 ?? 0,
          managed: managedCpuPct.toFixed(1),
        })}
        series={history.map((p) => p.cpuPercent ?? 0)}
        history={history}
        format={(v) => `${v.toFixed(1)}%`}
      />
      <LiveTile
        label={t("ram")}
        value={`${memPct(cur).toFixed(0)}%`}
        hint={t("ramHint", {
          used: formatBytes(cur.memoryUsedBytes),
          total: formatBytes(cur.memoryTotalBytes),
          managed: formatBytes(data.managed.memoryBytes),
          percent: managedMemPct.toFixed(1),
        })}
        series={history.map(memPct)}
        history={history}
        format={(v) => `${v.toFixed(1)}%`}
      />
      <LiveTile
        label={t("storage")}
        value={cur.diskTotalBytes > 0 ? `${diskPct(cur).toFixed(0)}%` : "–"}
        hint={
          cur.diskTotalBytes > 0
            ? t("storageHint", {
                used: formatBytes(cur.diskUsedBytes),
                total: formatBytes(cur.diskTotalBytes),
                free: formatBytes(cur.diskTotalBytes - cur.diskUsedBytes),
              })
            : t("storageUnreadable")
        }
        series={history.map(diskPct)}
        history={history}
        format={(v) => `${v.toFixed(1)}%`}
      />
    </div>
  )
}

function LiveTile({
  label,
  value,
  hint,
  series,
  history,
  format,
}: {
  label: string
  value: string
  hint: string
  series: number[]
  history: HostSample[]
  format: (v: number) => string
}) {
  const t = useTranslations("dashboard.live")
  return (
    <Card size="sm">
      <CardContent className="space-y-1">
        <div className="flex items-baseline justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground">{t("last5min")}</p>
        </div>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
        {series.length > 1 && (
          <AreaChart
            points={series.map((value, i) => ({
              value,
              at: history[i]?.at ?? "",
            }))}
            format={format}
            domain={[0, 100]}
            slots={POINTS}
            height={112}
            ariaLabel={t("chartAria", { value: format(series[series.length - 1]) })}
          />
        )}
      </CardContent>
    </Card>
  )
}
