"use client"

import { Cpu, MemoryStick, Network } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { StatCard } from "@/components/custom/stat-card"
import { fetchMetricsAction } from "@/features/monitoring/monitoring.actions"
import {
  formatBytes,
  METRIC_RANGES,
  type ContainerMetrics,
  type MetricRange,
  type MetricsResponse,
  type MetricsTarget,
} from "@/features/monitoring/monitoring.entity"

const RANGE_KEY: Record<MetricRange, string> = {
  "1h": "h1",
  "24h": "h24",
  "7d": "d7",
  "30d": "d30",
}

/** Matches the API sampler (SAMPLE_INTERVAL_MS); polling faster gains nothing. */
const POLL_MS = 15_000

/**
 * KPI row for one container: CPU, memory, network. Values come from the
 * API's background sampler (point-in-time + last hour), so the page never
 * waits on a Docker stats call. Single series per tile → sparkline without a
 * legend; the number is the label.
 */
export function MetricsPanel({
  target,
  id,
  initial,
  running,
}: {
  target: MetricsTarget
  id: string
  initial: MetricsResponse
  running: boolean
}) {
  const t = useTranslations("common")
  const [data, setData] = useState(initial)
  const [range, setRange] = useState<MetricRange>("1h")

  useEffect(() => {
    // Stored ranges are fetched once per range change and then refreshed at
    // the sampler's pace; the live range keeps its 15 s poll.
    let cancelled = false
    const tick = async () => {
      const next = await fetchMetricsAction(target, id, range)
      if (!cancelled) setData(next)
    }
    if (range !== "1h") void tick()
    if (!running && range === "1h") return
    const timer = setInterval(() => void tick(), POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [target, id, running, range])

  const picker = (
    <div className="flex justify-end gap-1">
      {METRIC_RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => setRange(r)}
          aria-pressed={r === range}
          className={`rounded px-2 py-0.5 text-xs ${
            r === range
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {t(`metrics.range.${RANGE_KEY[r]}`)}
        </button>
      ))}
    </div>
  )

  const cur = data.current
  if (!cur) {
    return (
      <div className="space-y-2">
        {picker}
        <p className="text-xs text-muted-foreground">
          {range !== "1h"
            ? t("metrics.noStoredHistory")
            : running
              ? t("metrics.notAvailableYet")
              : t("metrics.notRunning")}
        </p>
      </div>
    )
  }

  const memPct =
    cur.memoryLimitBytes > 0
      ? (cur.memoryBytes / cur.memoryLimitBytes) * 100
      : null

  return (
    <div className="space-y-2">
      {picker}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Cpu}
          label="CPU"
          value={
            cur.cpuPercent === null ? "–" : `${cur.cpuPercent.toFixed(1)}%`
          }
          hint={
            data.tasks && data.tasks > 1
              ? t("metrics.cpuHintTasks", { tasks: data.tasks })
              : t("metrics.cpuHint")
          }
          trend={{
            series: data.history.map((p) => p.cpuPercent ?? 0),
            format: (v) => `${v.toFixed(1)}%`,
            history: data.history,
          }}
        />
        <StatCard
          icon={MemoryStick}
          label={t("metrics.memory")}
          value={formatBytes(cur.memoryBytes)}
          hint={
            memPct === null
              ? undefined
              : t("metrics.memoryHint", {
                  pct: memPct.toFixed(1),
                  limit: formatBytes(cur.memoryLimitBytes),
                })
          }
          trend={{
            series: data.history.map((p) => p.memoryBytes),
            format: formatBytes,
            history: data.history,
          }}
        />
        <StatCard
          icon={Network}
          label={t("metrics.network")}
          value={`↓ ${formatBytes(cur.netRxBytes)}`}
          hint={t("metrics.networkHint", { tx: formatBytes(cur.netTxBytes) })}
          trend={{
            series: rxRate(data.history),
            format: (v) => `${formatBytes(v)}/s`,
            history: data.history,
          }}
        />
      </div>
      {range !== "1h" && (
        <p className="text-xs text-muted-foreground">
          {t(
            range === "24h"
              ? "metrics.storedNotePerMinute"
              : "metrics.storedNotePerHour",
            { count: data.history.length }
          )}
        </p>
      )}
    </div>
  )
}

/**
 * Counters are cumulative since container start; the chart wants a rate.
 * Bytes received between consecutive samples divided by the seconds
 * between them (a restart resets the counter → clamp at 0).
 */
function rxRate(history: ContainerMetrics[]): number[] {
  return history.map((p, i) => {
    if (i === 0) return 0
    const prev = history[i - 1]
    const secs =
      (new Date(p.at).getTime() - new Date(prev.at).getTime()) / 1000 || 1
    return Math.max(0, (p.netRxBytes - prev.netRxBytes) / secs)
  })
}
