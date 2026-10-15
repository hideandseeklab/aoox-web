import type { ReactNode } from "react"

/**
 * One labelled fact in a resource header's meta line: a muted label and its value side by side.
 * The label never wraps away from the value; a long value wraps inside its own box.
 */
export function HeaderFact({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <span className="inline-flex min-w-0 items-baseline gap-1">
      <span className="shrink-0">{label}:</span>
      {children}
    </span>
  )
}
