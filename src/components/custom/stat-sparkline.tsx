"use client"

import { useId, useState, useSyncExternalStore } from "react"

// Wide canvas stretched to the tile (preserveAspectRatio="none"), so the
// line always spans the full width; strokes use non-scaling widths.
const W = 600
const H = 48

/**
 * 2px line in the de-emphasis ink, the current point in the accent; hover
 * reads out the nearest sample. Ink is a text token, the accent carries
 * "now" — no legend needed for a single series. Shared by the per-resource
 * MetricsPanel and the project ProjectResourcePanel (any history whose points
 * carry an `at` timestamp).
 */
export function StatSparkline({
  series,
  format,
  history,
}: {
  series: number[]
  format: (v: number) => string
  history: { at: string }[]
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
