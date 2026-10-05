import type { ReactNode } from "react"

export interface ActivityItem {
  id: string
  /** Left column, e.g. a formatted time. */
  time: ReactNode
  /** Main line. */
  title: ReactNode
  /** Quieter second line under the title. */
  detail?: ReactNode
  /** Right-aligned extra, e.g. a status badge. */
  trailing?: ReactNode
  /** Native tooltip on the title line. */
  titleHint?: string
}

/**
 * A short list of things that happened: time on the left, what on the
 * right, optional detail line and trailing element. Used by the dashboard's
 * Recent activity card; the same shape fits a deployment or backup history.
 */
export function ActivityList({ items }: { items: ActivityItem[] }) {
  return (
    <ul className="divide-y rounded-md border text-xs">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 px-3 py-2">
          <span
            className="w-24 shrink-0 text-muted-foreground"
            suppressHydrationWarning
          >
            {item.time}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate" title={item.titleHint}>
              {item.title}
            </span>
            {item.detail && (
              <span className="block truncate text-muted-foreground">
                {item.detail}
              </span>
            )}
          </span>
          {item.trailing}
        </li>
      ))}
    </ul>
  )
}
