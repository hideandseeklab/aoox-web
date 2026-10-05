import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * One row above a page's content: the status on the left (a badge), a short
 * line of context next to it, and small actions pushed to the right. Wraps on
 * narrow screens. Not used by any page yet: the application, database and
 * compose pages adopt it in a later stage, moving their existing status badge
 * and buttons here without adding information.
 */
export function StatusStrip({
  status,
  info,
  actions,
  className,
}: {
  status: ReactNode
  info?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2",
        className
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {status}
        {info && <span className="text-xs text-muted-foreground">{info}</span>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
