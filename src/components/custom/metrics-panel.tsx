"use client"

import { Cpu, MemoryStick, Network } from "lucide-react"
import { useEffect, useState } from "react"
import { StatCard } from "@/components/custom/stat-card"
import { fetchMetricsAction } from "@/features/monitoring/monitoring.actions"
import {
  formatBytes,
  METRIC_RANGE_LABEL,
  METRIC_RANGES,
  type ContainerMetrics,
  type MetricRange,
  type MetricsResponse,
  type MetricsTarget,
} from "@/features/monitoring/monitoring.entity"

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
          {METRIC_RANGE_LABEL[r]}
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
            ? "Belum ada riwayat tersimpan untuk rentang ini."
            : running
              ? "Metrik belum tersedia — sampel pertama diambil dalam ±15 detik."
              : "Container tidak berjalan; tidak ada metrik."}
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
          variant="tile"
          icon={Cpu}
          label="CPU"
          value={
            cur.cpuPercent === null ? "–" : `${cur.cpuPercent.toFixed(1)}%`
          }
          hint={
            data.tasks && data.tasks > 1
              ? `dari satu core · jumlah ${data.tasks} task`
              : "dari satu core"
          }
          trend={{
            series: data.history.map((p) => p.cpuPercent ?? 0),
            format: (v) => `${v.toFixed(1)}%`,
            history: data.history,
          }}
        />
        <StatCard
          variant="tile"
          icon={MemoryStick}
          label="Memori"
          value={formatBytes(cur.memoryBytes)}
          hint={
            memPct === null
              ? undefined
              : `${memPct.toFixed(1)}% dari ${formatBytes(cur.memoryLimitBytes)} (RAM host, tanpa limit)`
          }
          trend={{
            series: data.history.map((p) => p.memoryBytes),
            format: formatBytes,
            history: data.history,
          }}
        />
        <StatCard
          variant="tile"
          icon={Network}
          label="Jaringan"
          value={`↓ ${formatBytes(cur.netRxBytes)}`}
          hint={`↑ ${formatBytes(cur.netTxBytes)} · kumulatif sejak start · grafik: masuk per detik`}
          trend={{
            series: rxRate(data.history),
            format: (v) => `${formatBytes(v)}/s`,
            history: data.history,
          }}
        />
      </div>
      {range !== "1h" && (
        <p className="text-xs text-muted-foreground">
          Riwayat tersimpan: rata-rata per {range === "24h" ? "menit" : "jam"} (
          {data.history.length} titik). Nilai besar = saat itu, bukan sekarang.
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
