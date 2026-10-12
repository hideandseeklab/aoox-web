import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Header of a tab's main section: a title with one short muted line (a count and/or a hint) on the
 * left, the primary action on the right. Wraps on narrow screens. When the section is a single card,
 * give the card's header the same layout instead of stacking this above it.
 */
export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2",
        className
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex flex-wrap items-center gap-2">{action}</div>
      )}
    </div>
  )
}
