import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type StatusTone = "success" | "neutral" | "danger" | "warning"

const DOT: Record<StatusTone, string> = {
  success: "bg-emerald-500",
  neutral: "bg-muted-foreground/60",
  danger: "bg-destructive",
  warning: "bg-amber-500",
}

/** The resource's main status: an outlined badge with a coloured dot in front of the text. */
export function ResourceStatus({
  tone,
  children,
}: {
  tone: StatusTone
  children: ReactNode
}) {
  return (
    <Badge variant="outline" className="gap-1.5">
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", DOT[tone])}
      />
      {children}
    </Badge>
  )
}

/**
 * Header card at the top of a resource's detail page (application, database, compose stack): back
 * button, an icon tile, the name with its status badges, one muted line of short facts separated
 * by "·", and the primary actions on the right. Wraps on narrow screens: the actions drop under
 * the title. The tab strip sits directly below it.
 */
export function ResourceHeader({
  backHref,
  backLabel,
  icon,
  title,
  badges,
  meta,
  actions,
  className,
}: {
  backHref: string
  backLabel: string
  /** The resource's logo or glyph, centred in the tile (give it `size-5`). */
  icon: ReactNode
  title: string
  badges?: ReactNode
  /** Short facts shown on one muted line; falsy items are skipped. */
  meta?: ReactNode[]
  actions?: ReactNode
  className?: string
}) {
  const facts = (meta ?? []).filter(Boolean)
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border bg-linear-to-br from-primary/8 via-card to-card p-4 sm:p-5",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 basis-72 items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href={backHref} aria-label={backLabel}>
            <ArrowLeft />
          </Link>
        </Button>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground">
          {icon}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="min-w-0 text-lg leading-tight font-semibold break-words">
              {title}
            </h1>
            {badges}
          </div>
          {facts.length > 0 && (
            <p className="flex flex-col gap-y-0.5 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1.5">
              {facts.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex min-w-0 items-baseline gap-1.5"
                >
                  <span className="min-w-0 break-words">{f}</span>
                  {i < facts.length - 1 && (
                    <span aria-hidden className="hidden shrink-0 sm:inline">
                      ·
                    </span>
                  )}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  )
}
