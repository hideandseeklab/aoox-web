"use client"

import { useLayoutEffect, useSyncExternalStore } from "react"

export interface Crumb {
  label: string
  /** Omitted on the current page (last crumb). */
  href?: string
}

/**
 * Tiny external store so a page (server component) can hand its crumbs to
 * the navbar (a sibling in the layout) through a client child, without a
 * context provider or setState-in-effect.
 */
let current: Crumb[] | null = null
const listeners = new Set<() => void>()

function set(items: Crumb[] | null) {
  current = items
  for (const l of listeners) l()
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useBreadcrumb(): Crumb[] | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null
  )
}

/** Rendered by a page to publish its crumbs; cleared when the page unmounts. */
export function SetBreadcrumb({ items }: { items: Crumb[] }) {
  const key = JSON.stringify(items)
  useLayoutEffect(() => {
    set(JSON.parse(key) as Crumb[])
    return () => set(null)
  }, [key])
  return null
}
