import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * An empty state with an illustration: a centered column of picture, heading,
 * one muted line and the actions. `size` scales the picture for tight places
 * (a popover or a narrow column). By default it sits in a dashed rounded box
 * as wide as its container, so every empty state looks the same; pass
 * `bordered={false}` where the surrounding popover or card already frames it.
 */
export function IllustratedEmptyState({
  illustration,
  title,
  description,
  actions,
  size = "md",
  bordered = true,
  className,
}: {
  illustration: ReactNode
  title: ReactNode
  description: ReactNode
  actions?: ReactNode
  size?: "sm" | "md"
  bordered?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        size === "md" ? "gap-1 px-4 py-8 sm:py-10" : "gap-0.5 px-2 py-4",
        bordered && "rounded-lg border border-dashed",
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
          size === "md"
            ? "mt-2 text-base font-medium"
            : "mt-1 text-sm font-medium"
        )}
      >
        {title}
      </h2>
      <p className="max-w-90 text-xs text-muted-foreground">{description}</p>
      {actions && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
