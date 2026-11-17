"use client"

import { useState } from "react"

/**
 * A row being created by a click (a manual backup), shown as a placeholder
 * from the click until the real row is in `rows`, so the list does not jump
 * when the request finishes. `detail` keeps whatever the placeholder shows
 * that the user picked at click time (e.g. the volume), even if the picker
 * changes while it runs.
 */
export function usePendingRow<D = undefined>(rows: { id: string }[]) {
  const [pending, setPending] = useState<{
    id: string | null
    detail: D
  } | null>(null)
  const showPlaceholder =
    pending !== null &&
    !(pending.id !== null && rows.some((r) => r.id === pending.id))
  return {
    showPlaceholder,
    /** What was passed to `begin` (only meaningful while `showPlaceholder`). */
    detail: pending?.detail,
    begin: (detail: D) => setPending({ id: null, detail }),
    /** The API answered with the new row's id: the placeholder stays until it is listed. */
    landed: (id: string) => setPending((p) => (p ? { ...p, id } : p)),
    /** Nothing was created (or the id is unknown): drop the placeholder now. */
    cancel: () => setPending(null),
  }
}
