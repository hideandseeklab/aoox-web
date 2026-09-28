"use client"

import { useEffect, useId, useState, useSyncExternalStore } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { fetchProjectResourceUsageAction } from "@/features/project/project.actions"
import type {
  ProjectResourceUsagePoint,
  ProjectResourceUsageResponse,
} from "@/features/project/project.entity"
import { formatBytes } from "@/features/monitoring/monitoring.entity"

/** Matches the API sampler (SAMPLE_INTERVAL_MS); polling faster gains nothing. */
const POLL_MS = 15_000

/**
 * CPU/RAM/network for the whole project (every application, database and
 * compose stack container summed), live only — the API endpoint has no
 * stored history, unlike the per-resource MetricsPanel, so there is no
 * range picker here.
 */
export function ProjectResourcePanel({
  projectId,
  initial,
}: {
  projectId: string
  initial: ProjectResourceUsageResponse
}) {
  const [data, setData] = useState(initial)

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      const next = await fetchProjectResourceUsageAction(projectId)
      if (!cancelled) setData(next)
    }
    const timer = setInterval(() => void tick(), POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [projectId])

  const cur = data.current
  if (!cur) {
    return (
      <p className="text-sm text-muted-foreground">
        Tidak ada aplikasi/database/stack yang berjalan di project ini.
      </p>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatTile
        label="CPU"
        value={cur.cpuPercent === null ? "–" : `${cur.cpuPercent.toFixed(1)}%`}
        hint={`jumlah ${data.containers} container`}
        series={data.history.map((p) => p.cpuPercent ?? 0)}
        format={(v) => `${v.toFixed(1)}%`}
        history={data.history}
      />
      <StatTile
        label="Memori"
        value={formatBytes(cur.memoryBytes)}
        series={data.history.map((p) => p.memoryBytes)}
        format={formatBytes}
        history={data.history}
      />
      <StatTile
        label="Jaringan"
        value={
          cur.netRxBytesPerSec === null ? "–" : `↓ ${formatBytes(cur.netRxBytesPerSec)}/s`
        }
        hint={
          cur.netTxBytesPerSec === null
            ? undefined
            : `↑ ${formatBytes(cur.netTxBytesPerSec)}/s`
        }
        series={data.history.map((p) => p.netRxBytesPerSec ?? 0)}
        format={(v) => `${formatBytes(v)}/s`}
        history={data.history}
      />
    </div>
  )
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
  history?: ProjectResourceUsagePoint[]
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
 * "now" — no legend needed for a single series. Mirrors MetricsPanel's
 * Sparkline (kept separate since the point shape differs slightly).
 */
function Sparkline({
  series,
  format,
  history,
}: {
  series: number[]
  format: (v: number) => string
  history: ProjectResourceUsagePoint[]
}) {
  const [hover, setHover] = useState<number | null>(null)
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
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
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
