import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * An empty state with an illustration: a centered column of picture, heading,
 * one muted line and the actions. `size` scales the picture for tight places
 * (a popover or a narrow column).
 */
export function IllustratedEmptyState({
  illustration,
  title,
  description,
  actions,
  size = "md",
  className,
}: {
  illustration: ReactNode
  title: ReactNode
  description: ReactNode
  actions?: ReactNode
  size?: "sm" | "md"
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        size === "md" ? "gap-1 px-4 py-10" : "gap-0.5 px-2 py-4",
        className
      )}
    >
      <div
        className={cn(
          "w-full [&>svg]:h-auto [&>svg]:w-full",
          size === "md" ? "max-w-60" : "max-w-36"
        )}
      >
        {illustration}
      </div>
      <h2
        className={cn(
          "font-medium",
          size === "md" ? "mt-2 text-lg" : "mt-1 text-sm"
        )}
      >
        {title}
      </h2>
      <p
        className={cn(
          "max-w-90 text-muted-foreground",
          size === "md" ? "text-sm" : "text-xs"
        )}
      >
        {description}
      </p>
      {actions && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
