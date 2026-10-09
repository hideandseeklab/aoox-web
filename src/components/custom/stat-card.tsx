import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { StatSparkline } from "@/components/custom/stat-sparkline"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type Tone = "default" | "success" | "danger"

/** Status tints: the label carries the meaning too, colour is reinforcement only. */
const TONE: Record<Tone, { card: string; text: string }> = {
  default: { card: "", text: "" },
  success: {
    card: "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  danger: {
    card: "border-red-500/40 bg-red-500/5 dark:bg-red-500/10",
    text: "text-red-700 dark:text-red-400",
  },
}

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
 * The one statistic block of the panel: a label, a big number and an optional
 * caption. Three sizes, each the exact look the page had before they were
 * merged:
 * - `card`: dashboard KPI (own card, `text-3xl` number, optional tone and an
 *   `action` row such as a button).
 * - `tile`: compact card for a metrics row (`text-2xl` number), optional
 *   sparkline via `trend`.
 * - `inset`: bordered box to sit inside another card.
 */
export function StatCard({
  label,
  icon,
  value,
  hint,
  variant = "card",
  tone = "default",
  action,
  trend,
  className,
}: {
  label: string
  /** Optional icon shown in a small chip before the label. */
  icon?: LucideIcon
  value: ReactNode
  hint?: ReactNode
  variant?: "card" | "tile" | "inset"
  tone?: Tone
  action?: ReactNode
  trend?: Trend
  className?: string
}) {
  if (variant === "inset") {
    return (
      <div className={`rounded-md border px-3 py-2 ${className ?? ""}`.trim()}>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon && <IconChip icon={icon} />}
          {label}
        </p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {hint && (
          <p className="text-xs text-muted-foreground tabular-nums">{hint}</p>
        )}
      </div>
    )
  }

  if (variant === "tile") {
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

  const t = TONE[tone]
  return (
    <Card className={`${t.card} ${className ?? ""}`.trim() || undefined}>
      <CardHeader>
        <CardDescription
          className={
            `${icon ? "flex items-center gap-2" : ""} ${t.text}`.trim() ||
            undefined
          }
        >
          {icon && <IconChip icon={icon} />}
          {label}
        </CardDescription>
        <CardTitle
          className={`text-3xl tracking-tighter tabular-nums ${t.text}`.trim()}
        >
          {value}
        </CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className="text-xs text-muted-foreground">
          {hint}
        </CardContent>
      )}
      {action && <CardContent>{action}</CardContent>}
    </Card>
  )
}
