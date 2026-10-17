import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Top-level page header: title with one muted line on the left, an optional action group on the right.
 * The actions are centred against the whole title + description block; on narrow screens they wrap
 * under the title, left-aligned.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-3",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-lg font-semibold">{title}</h1>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  )
}
