import type { ReactNode } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

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
          <div
            key={item.title}
            className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>
            </div>
            <div className="flex shrink-0 justify-end">{item.action}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
