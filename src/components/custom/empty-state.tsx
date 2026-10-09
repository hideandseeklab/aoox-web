import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * The empty list: a dashed box with an icon, one sentence and, when the user
 * can act on it, one button. `compact` is for lists inside a card or tab.
 */
export function EmptyState({
  icon: Icon,
  children,
  action,
  compact = false,
  className,
}: {
  icon: LucideIcon
  children: ReactNode
  action?: ReactNode
  compact?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border border-dashed text-center",
        compact ? "p-6" : "p-8",
        className
      )}
    >
      <Icon aria-hidden="true" className="size-6 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">{children}</p>
      {action}
    </div>
  )
}
