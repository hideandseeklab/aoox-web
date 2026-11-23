"use client"

import { useEffect, useId } from "react"
import { setUnsaved } from "@/lib/unsaved-changes"

/**
 * Reports this component's unsaved changes to the guard: while `dirty` is
 * true, leaving the page (link, back button, guarded tab switch, reload or
 * tab close) asks first. Unmounting clears it, so a Save that closes the
 * editor or a Cancel needs nothing else.
 */
export function useUnsavedChanges(dirty: boolean): void {
  const id = useId()
  useEffect(() => {
    if (!dirty) return
    setUnsaved(id, true)
    return () => setUnsaved(id, false)
  }, [dirty, id])
}
