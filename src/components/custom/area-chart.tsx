"use client"

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { cn } from "@/lib/utils"

export interface ChartPoint {
  /** `null` leaves a gap (no data for that sample). */
  value: number | null
  /** ISO timestamp, shown in the tooltip and under the axis. */
  at: string
}

const PAD = 3

type XY = [number, number]

/** Monotone cubic (Fritsch–Carlson): smooth, and never overshoots the samples. */
function smooth(pts: XY[]): string {
  const n = pts.length
  if (n === 1) return `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  const dx: number[] = []
  const slope: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0])
    slope.push((pts[i + 1][1] - pts[i][1]) / (dx[i] || 1))
  }
  const tan: number[] = [slope[0]]
  for (let i = 1; i < n - 1; i++)
    tan.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2)
  tan.push(slope[n - 2])
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tan[i] = 0
      tan[i + 1] = 0
      continue
    }
    const a = tan[i] / slope[i]
    const b = tan[i + 1] / slope[i]
    const h = Math.hypot(a, b)
    if (h > 3) {
      tan[i] = (3 * a * slope[i]) / h
      tan[i + 1] = (3 * b * slope[i]) / h
    }
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const w = dx[i] / 3
    d +=
      ` C${(pts[i][0] + w).toFixed(1)},${(pts[i][1] + tan[i] * w).toFixed(1)}` +
      ` ${(pts[i + 1][0] - w).toFixed(1)},${(pts[i + 1][1] - tan[i + 1] * w).toFixed(1)}` +
      ` ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`
  }
  return d
}

/**
 * Single-series area chart: a smooth line in the `primary` token over a faint
 * fade to transparent, a hover/touch tooltip (value + time) and a minimal axis
 * (the top of the scale and the first/last time). Drawn at the real pixel
 * width, so nothing is stretched. Used by the metric panels, the host charts
 * and the latency chart.
 */
export function AreaChart({
  points,
  format,
  describe,
  domain,
  slots,
  height = 48,
  marks,
  ariaLabel,
  className,
}: {
  points: ChartPoint[]
  format: (v: number) => string
  /** Overrides the tooltip's first line for a sample (default: `format(value)`). */
  describe?: (index: number) => string
  /** Fixed value scale (a percentage stays 0–100); default 0 to the largest sample. */
  domain?: [number, number]
  /** Total sample positions: a shorter history is right-aligned and grows leftwards. */
  slots?: number
  height?: number
  /** Sample indexes flagged with a red tick at the bottom (e.g. failed checks). */
  marks?: number[]
  ariaLabel: string
  className?: string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState<number | null>(null)
  const gradId = useId()
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  )

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const n = points.length
  const total = Math.max(slots ?? n, n, 2)
  const innerW = Math.max(width - PAD * 2, 1)
  const step = innerW / (total - 1)
  const first = total - n
  const x = (i: number) => PAD + (first + i) * step

  const values = points.map((p) => p.value)
  const lo = domain ? domain[0] : 0
  const dataMax = Math.max(...values.map((v) => v ?? 0), 0)
  const hi = domain ? domain[1] : dataMax > 0 ? dataMax * 1.1 : 1
  const y = (v: number) =>
    height - PAD - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo || 1)) * (height - PAD * 2)

  // Runs of consecutive samples that have a value.
  const runs: { i: number; pts: XY[] }[] = []
  values.forEach((v, i) => {
    if (v === null) return
    const run = runs[runs.length - 1]
    if (run && run.i + run.pts.length === i) run.pts.push([x(i), y(v)])
    else runs.push({ i, pts: [[x(i), y(v)]] })
  })

  const latest = n - 1
  const shown = hover ?? latest
  const pt = points[shown]
  const px = x(shown)
  const flip = width > 0 && px > width * 0.65

  function move(clientX: number) {
    const el = wrapRef.current
    if (!el || n === 0) return
    const rect = el.getBoundingClientRect()
    const rel = (clientX - rect.left - PAD) / step - first
    setHover(Math.min(n - 1, Math.max(0, Math.round(rel))))
  }

  const time = (iso: string) => (mounted ? new Date(iso).toLocaleTimeString() : "")

  return (
    <div className={cn("space-y-0.5", className)}>
      <div
        ref={wrapRef}
        className="relative text-primary"
        style={{ height }}
        onPointerMove={(e) => move(e.clientX)}
        onPointerDown={(e) => move(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute start-1 top-0 text-[10px] leading-none text-muted-foreground tabular-nums"
        >
          {format(hi)}
        </span>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={ariaLabel}
            className="block"
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="currentColor" stopOpacity={0.3} />
                <stop offset="1" stopColor="currentColor" stopOpacity={0} />
              </linearGradient>
            </defs>
            <line
              x1={0}
              x2={width}
              y1={height - PAD}
              y2={height - PAD}
              stroke="currentColor"
              className="text-border"
            />
            {runs.map((r) => {
              if (r.pts.length === 1)
                return (
                  <circle
                    key={r.i}
                    cx={r.pts[0][0]}
                    cy={r.pts[0][1]}
                    r={2}
                    fill="currentColor"
                  />
                )
              const line = smooth(r.pts)
              const a = r.pts[0][0].toFixed(1)
              const b = r.pts[r.pts.length - 1][0].toFixed(1)
              return (
                <g key={r.i}>
                  <path
                    d={`${line} L${b},${height - PAD} L${a},${height - PAD} Z`}
                    fill={`url(#${gradId})`}
                  />
                  <path
                    d={line}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </g>
              )
            })}
            {marks?.map((i) => (
              <line
                key={i}
                x1={x(i)}
                x2={x(i)}
                y1={height - PAD - 7}
                y2={height - PAD}
                stroke="currentColor"
                strokeWidth={2.5}
                className="text-destructive"
              />
            ))}
            {hover !== null && (
              <line
                x1={px}
                x2={px}
                y1={0}
                y2={height}
                stroke="currentColor"
                className="text-muted-foreground/60"
              />
            )}
            {pt?.value != null && (
              <circle
                cx={px}
                cy={y(pt.value)}
                r={3}
                fill="currentColor"
                className="text-primary"
                stroke="var(--card)"
                strokeWidth={1.5}
              />
            )}
          </svg>
        )}
        {hover !== null && pt && (
          <div
            role="presentation"
            className="pointer-events-none absolute top-1 z-10 rounded-md border bg-popover px-2 py-1 text-[11px] whitespace-nowrap text-popover-foreground shadow-md tabular-nums"
            style={
              flip
                ? { right: width - px + 8 }
                : { left: px + 8 }
            }
          >
            <div className="font-medium">
              {describe
                ? describe(hover)
                : pt.value === null
                  ? "tanpa data"
                  : format(pt.value)}
            </div>
            {mounted && (
              <div className="text-muted-foreground">{time(pt.at)}</div>
            )}
          </div>
        )}
      </div>
      {mounted && n > 1 && (
        <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
          <span>{time(points[0].at)}</span>
          <span>{time(points[n - 1].at)}</span>
        </div>
      )}
    </div>
  )
}
