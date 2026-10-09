"use client"

import { AreaChart } from "@/components/custom/area-chart"

/**
 * The trend under a metric tile: a smooth area chart in the `primary` token
 * with a value + time tooltip. Shared by the per-resource MetricsPanel and the
 * project ProjectResourcePanel (any history whose points carry an `at`
 * timestamp).
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
  const last = series.length - 1
  return (
    <AreaChart
      points={series.map((value, i) => ({
        value,
        at: history[i]?.at ?? "",
      }))}
      format={format}
      height={64}
      ariaLabel={`Riwayat 1 jam, terakhir ${format(series[last])}`}
    />
  )
}
