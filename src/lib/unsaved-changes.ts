/**
 * Unsaved-changes guard: a module-level store (no React) that editors report
 * their dirty state to, plus the pure rules for which link clicks leave the
 * page. `UnsavedChangesGuard` (dashboard layout) renders the confirmation
 * dialog and installs the `beforeunload`, click and `popstate` listeners;
 * `useUnsavedChanges(dirty)` registers an editor. Next.js 16 App Router has no
 * route-change events (only a per-`Link` `onNavigate`), so in-app navigation
 * is caught globally instead.
 */

const dirty = new Set<string>()
let pending: (() => void) | null = null
let guards = 0
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export function subscribeUnsaved(l: () => void): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** Marks one source (an editor instance) as dirty or clean. */
export function setUnsaved(id: string, on: boolean): void {
  if (on) dirty.add(id)
  else dirty.delete(id)
}

export function hasUnsavedChanges(): boolean {
  return dirty.size > 0
}

/**
 * Forgets every dirty source. Call it synchronously right before a navigation
 * that follows a successful save (the editor still differs from its initial
 * text until it unmounts).
 */
export function clearUnsavedChanges(): void {
  dirty.clear()
}

/** Called by the dialog component while it is mounted. */
export function registerUnsavedGuard(): () => void {
  guards++
  return () => {
    guards--
  }
}

/**
 * Runs `proceed` now when nothing is dirty (or no guard dialog is mounted);
 * otherwise asks first and runs it only when the user discards.
 */
export function confirmDiscard(proceed: () => void): void {
  if (!hasUnsavedChanges() || guards === 0) {
    proceed()
    return
  }
  pending = proceed
  emit()
}

export function hasPendingDiscard(): boolean {
  return pending !== null
}

/** The dialog's answer: `discard` clears the dirty sources and proceeds. */
export function resolvePendingDiscard(discard: boolean): void {
  const proceed = pending
  pending = null
  emit()
  if (discard && proceed) {
    dirty.clear()
    proceed()
  }
}

/** What the click handler reads from a click on a link. */
export interface LinkClick {
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  defaultPrevented: boolean
  /** The anchor's `target` attribute ("" when absent). */
  target: string
  hasDownload: boolean
  /** The anchor's resolved `href`. */
  href: string
}

/**
 * True when the click would navigate this tab to another in-app page: a plain
 * left click on a same-origin link to a different path or query. Modified and
 * middle clicks (new tab), `target` other than `_self`, downloads, other
 * origins, hash-only changes and `/api/` routes (file downloads through route
 * handlers) are left alone.
 */
export function isLeavingClick(click: LinkClick, currentHref: string): boolean {
  if (click.defaultPrevented || click.button !== 0) return false
  if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey)
    return false
  if (click.target && click.target !== "_self") return false
  if (click.hasDownload) return false
  let url: URL
  let here: URL
  try {
    here = new URL(currentHref)
    url = new URL(click.href, here)
  } catch {
    return false
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false
  if (url.origin !== here.origin) return false
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return false
  return url.pathname + url.search !== here.pathname + here.search
}

/**
 * How far a back/forward traversal moved, from the Navigation API entry
 * indexes; a back step (-1) when they are unknown (no Navigation API).
 */
export function traversalDelta(
  before: number | null | undefined,
  after: number | null | undefined
): number {
  if (typeof before !== "number" || typeof after !== "number") return -1
  return after - before
}
