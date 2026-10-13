import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { StatSparkline } from "@/components/custom/stat-sparkline"
import { Card, CardContent } from "@/components/ui/card"

/** Small rounded chip holding the card's icon; it takes the label's ink and a faint neutral wash. */
function IconChip({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span
      aria-hidden
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground/5"
    >
      <Icon className="size-3.5" />
    </span>
  )
}

interface Trend {
  series: number[]
  format: (v: number) => string
  history: { at: string }[]
}

/**
 * Compact statistic card for a metrics row (application, database, compose
 * and project pages): a label, a `text-2xl` number, an optional caption and
 * an optional sparkline via `trend`.
 */
export function StatCard({
  label,
  icon,
  value,
  hint,
  trend,
  className,
}: {
  label: string
  /** Optional icon shown in a small chip before the label. */
  icon?: LucideIcon
  value: ReactNode
  hint?: ReactNode
  trend?: Trend
  className?: string
}) {
  return (
    <Card size="sm" className={className}>
      <CardContent className="space-y-1">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon && <IconChip icon={icon} />}
          {label}
        </p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {hint && (
          <p className="text-xs text-muted-foreground tabular-nums">{hint}</p>
        )}
        {trend && trend.series.length > 1 && (
          <StatSparkline
            series={trend.series}
            format={trend.format}
            history={trend.history}
          />
        )}
      </CardContent>
    </Card>
  )
}
