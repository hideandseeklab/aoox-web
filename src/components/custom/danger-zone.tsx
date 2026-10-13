import type { ReactNode } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * Last card of a detail page for irreversible actions: a red-tinted card with one row per action
 * (what it does on the left, its destructive button on the right; stacked on narrow screens).
 */
export function DangerZone({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: { title: string; description: ReactNode; action: ReactNode }[]
}) {
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <DangerZoneItem
            key={item.title}
            title={item.title}
            description={item.description}
            action={item.action}
          />
        ))}
      </CardContent>
    </Card>
  )
}

/** One red-tinted row: what the action does on the left, its destructive button on the right (stacked on narrow screens). */
export function DangerZoneItem({
  title,
  description,
  action,
  className,
}: {
  title: string
  description: ReactNode
  action: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex shrink-0 justify-end">{action}</div>
    </div>
  )
}
