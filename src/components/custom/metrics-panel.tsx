"use client"

import { useEffect, useId, useState, useSyncExternalStore } from "react"
import { Card, CardContent } from "@/components/ui/card"
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
        <p className="text-sm text-muted-foreground">
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
        <StatTile
          label="CPU"
          value={
            cur.cpuPercent === null ? "–" : `${cur.cpuPercent.toFixed(1)}%`
          }
          hint={
            data.tasks && data.tasks > 1
              ? `dari satu core · jumlah ${data.tasks} task`
              : "dari satu core"
          }
          series={data.history.map((p) => p.cpuPercent ?? 0)}
          format={(v) => `${v.toFixed(1)}%`}
          history={data.history}
        />
        <StatTile
          label="Memori"
          value={formatBytes(cur.memoryBytes)}
          hint={
            memPct === null
              ? undefined
              : `${memPct.toFixed(1)}% dari ${formatBytes(cur.memoryLimitBytes)} (RAM host, tanpa limit)`
          }
          series={data.history.map((p) => p.memoryBytes)}
          format={formatBytes}
          history={data.history}
        />
        <StatTile
          label="Jaringan"
          value={`↓ ${formatBytes(cur.netRxBytes)}`}
          hint={`↑ ${formatBytes(cur.netTxBytes)} · kumulatif sejak start · grafik: masuk per detik`}
          series={rxRate(data.history)}
          format={(v) => `${formatBytes(v)}/s`}
          history={data.history}
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

function StatTile({
  label,
  value,
  hint,
  series,
  format,
  history,
}: {
  label: string
  value: string
  hint?: string
  series?: number[]
  format?: (v: number) => string
  history?: ContainerMetrics[]
}) {
  return (
    <Card size="sm">
      <CardContent className="space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        {series && series.length > 1 && format && history && (
          <Sparkline series={series} format={format} history={history} />
        )}
      </CardContent>
    </Card>
  )
}

// Wide canvas stretched to the tile (preserveAspectRatio="none"), so the
// line always spans the full width; strokes use non-scaling widths.
const W = 600
const H = 48

/**
 * 2px line in the de-emphasis ink, the current point in the accent; hover
 * reads out the nearest sample. Ink is a text token, the accent carries
 * "now" — no legend needed for a single series.
 */
function Sparkline({
  series,
  format,
  history,
}: {
  series: number[]
  format: (v: number) => string
  history: ContainerMetrics[]
}) {
  const [hover, setHover] = useState<number | null>(null)
  // Locale/timezone formatting differs between server and browser; only
  // format the timestamp on the client to avoid a hydration mismatch.
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  )
  const clipId = useId()
  const max = Math.max(...series, 1e-9)
  const step = W / Math.max(series.length - 1, 1)
  const x = (i: number) => i * step
  const y = (v: number) => H - 2 - (v / max) * (H - 4)
  const d = series
    .map(
      (v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`
    )
    .join(" ")
  const last = series.length - 1
  const i = hover ?? last
  const at = history[i]?.at
  const label = `${format(series[i])}${
    at && mounted ? ` · ${new Date(at).toLocaleTimeString()}` : ""
  }`

  return (
    <div className="space-y-0.5">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-12 w-full"
        role="img"
        aria-label={`Riwayat 1 jam, terakhir ${format(series[last])}`}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const px = ((e.clientX - rect.left) / rect.width) * W
          setHover(Math.min(last, Math.max(0, Math.round(px / step))))
        }}
        onMouseLeave={() => setHover(null)}
      >
        <clipPath id={clipId}>
          <rect x={0} y={0} width={W} height={H} />
        </clipPath>
        <path
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="text-muted-foreground"
          clipPath={`url(#${clipId})`}
          vectorEffect="non-scaling-stroke"
        />
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
        {/* "Now" marker: a short tick (a circle would be squashed by the stretch). */}
        <line
          x1={x(i)}
          x2={x(i)}
          y1={y(series[i]) - 5}
          y2={y(series[i]) + 5}
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          className="text-primary"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <p className="text-[11px] text-muted-foreground tabular-nums">{label}</p>
    </div>
  )
}
