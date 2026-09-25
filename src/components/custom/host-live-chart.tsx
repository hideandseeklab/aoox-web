"use client"

import { useEffect, useId, useState, useSyncExternalStore } from "react"
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
      <p className="text-sm text-muted-foreground">
        Sampel host pertama diambil dalam beberapa detik…
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
        label="CPU host"
        value={cur.cpuPercent === null ? "–" : `${cur.cpuPercent.toFixed(0)}%`}
        hint={`${data.cpus} core${cur.load1 ? ` · load ${cur.load1}` : ""} · container aoox ≈ ${managedCpuPct.toFixed(1)}%`}
        series={history.map((p) => p.cpuPercent ?? 0)}
        history={history}
        format={(v) => `${v.toFixed(1)}%`}
      />
      <LiveTile
        label="RAM host"
        value={`${memPct(cur).toFixed(0)}%`}
        hint={`${formatBytes(cur.memoryUsedBytes)} dari ${formatBytes(cur.memoryTotalBytes)} · container aoox ${formatBytes(data.managed.memoryBytes)} (${managedMemPct.toFixed(1)}%)`}
        series={history.map(memPct)}
        history={history}
        format={(v) => `${v.toFixed(1)}%`}
      />
      <LiveTile
        label="Storage host"
        value={cur.diskTotalBytes > 0 ? `${diskPct(cur).toFixed(0)}%` : "–"}
        hint={
          cur.diskTotalBytes > 0
            ? `${formatBytes(cur.diskUsedBytes)} dari ${formatBytes(cur.diskTotalBytes)} · sisa ${formatBytes(cur.diskTotalBytes - cur.diskUsedBytes)}`
            : "Filesystem tidak terbaca"
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
  return (
    <Card size="sm">
      <CardContent className="space-y-1">
        <div className="flex items-baseline justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground">5 menit terakhir</p>
        </div>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
        {series.length > 1 && (
          <AreaChart series={series} history={history} format={format} />
        )}
      </CardContent>
    </Card>
  )
}

// Wide, short canvas: the tile spans the page, so give the line room.
const W = 1200
const H = 120

/**
 * Fixed 0–100 scale (a percentage that jumps to full scale on its own would
 * be misleading), 25 % gridlines, 2px line + soft fill, hover crosshair.
 */
function AreaChart({
  series,
  history,
  format,
}: {
  series: number[]
  history: HostSample[]
  format: (v: number) => string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  )
  const gradId = useId()
  // Right-align: a short history starts at the left and grows rightwards
  // until it fills the width, then scrolls.
  const step = W / (POINTS - 1)
  const offset = W - (series.length - 1) * step
  const x = (i: number) => offset + i * step
  const y = (v: number) =>
    H - 1 - (Math.min(100, Math.max(0, v)) / 100) * (H - 2)
  const line = series
    .map(
      (v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`
    )
    .join(" ")
  const area = `${line} L${x(series.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`
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
        // Stretch to the card's width instead of letterboxing (default
        // xMidYMid would centre a fixed-ratio drawing); strokes below use
        // non-scaling widths so they stay crisp.
        preserveAspectRatio="none"
        className="h-28 w-full"
        role="img"
        aria-label={`Riwayat 5 menit, terakhir ${format(series[last])}`}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const px = ((e.clientX - rect.left) / rect.width) * W
          setHover(
            Math.min(last, Math.max(0, Math.round((px - offset) / step)))
          )
        }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity={0.25} />
            <stop offset="1" stopColor="currentColor" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {[25, 50, 75].map((g) => (
          <line
            key={g}
            x1={0}
            x2={W}
            y1={y(g)}
            y2={y(g)}
            stroke="currentColor"
            strokeWidth={1}
            className="text-border"
            strokeDasharray="2 4"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={area} fill={`url(#${gradId})`} className="text-primary" />
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="text-primary"
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
            className="text-muted-foreground"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {/* "Now" marker: a short vertical tick (a circle would be squashed by the stretch). */}
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
