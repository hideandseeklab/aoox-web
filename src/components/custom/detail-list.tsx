import type { ReactNode } from "react"
import { CopyButton } from "@/components/custom/copy-button"
import { cn } from "@/lib/utils"

export interface DetailItem {
  label: string
  value: string | ReactNode
  /** Technical values (hosts, ports, URLs) in a monospace chip. */
  mono?: boolean
  /** When set, a copy button after the value copies this text (defaults to the value text if it is a string). */
  copy?: string
}

/**
 * Label/value rows: the label on the left in the quiet ink, the value on the
 * right. `columns={2}` lays the pairs out in two columns from `sm` up and
 * stacks them below that. A `mono` value sits in the same chip the connection
 * cards always used, and `copy` adds the copy button.
 */
export function DetailList({
  items,
  columns = 1,
  className,
}: {
  items: DetailItem[]
  columns?: 1 | 2
  className?: string
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-8 gap-y-2 text-xs",
        columns === 2 && "sm:grid-cols-2",
        className
      )}
    >
      {items.map((item) => {
        const copyText =
          item.copy ??
          (item.mono && typeof item.value === "string" ? item.value : undefined)
        return (
          <div
            key={item.label}
            className="flex min-w-0 items-center justify-between gap-3"
          >
            <dt className="shrink-0 text-muted-foreground">{item.label}</dt>
            <dd className="flex min-w-0 items-center justify-end gap-2">
              {item.mono ? (
                <code className="min-w-0 truncate rounded bg-muted px-1.5 py-0.5 text-xs">
                  {item.value}
                </code>
              ) : (
                <span className="min-w-0 truncate">{item.value}</span>
              )}
              {copyText !== undefined && (
                <CopyButton label={item.label} text={copyText} />
              )}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
