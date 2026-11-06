import type { ReactNode } from "react"
import { cn } from "cn"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

type ActionAlertVariant = "default" | "destructive" | "warning"

const WARNING_CLASS =
  "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 [&_[data-slot=alert-description]]:text-amber-700/90 dark:[&_[data-slot=alert-description]]:text-amber-400/90"

const DESTRUCTIVE_CLASS =
  "[&_[data-slot=alert-description]]:text-destructive/90"

/**
 * An alert with an action next to its text. Layout only: on `sm` and up the
 * icon + title + description sit on the left and the action button(s) on the
 * right, vertically centred; on a phone everything stacks and the buttons go
 * full width. Built on the shadcn `Alert` primitives, which are not edited.
 *
 * `children` renders under the description for richer bodies (lists,
 * commands) that still belong to the text column.
 */
export function ActionAlert({
  icon,
  title,
  description,
  actions,
  variant = "default",
  className,
  children,
}: {
  icon?: ReactNode
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  variant?: ActionAlertVariant
  className?: string
  children?: ReactNode
}) {
  return (
    <Alert
      variant={variant === "destructive" ? "destructive" : "default"}
      className={cn(
        "flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4",
        variant === "warning" && WARNING_CLASS,
        variant === "destructive" && DESTRUCTIVE_CLASS,
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        {icon && (
          <span className="mt-0.5 shrink-0 [&_svg]:size-3.5" aria-hidden>
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          {title && <AlertTitle>{title}</AlertTitle>}
          {description && (
            <AlertDescription className="break-words">
              {description}
            </AlertDescription>
          )}
          {children}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row max-sm:[&_[data-slot=button]]:w-full">
          {actions}
        </div>
      )}
    </Alert>
  )
}
