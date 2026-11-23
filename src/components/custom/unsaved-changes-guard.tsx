"use client"

import { useTranslations } from "next-intl"
import { useEffect, useSyncExternalStore } from "react"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import {
  confirmDiscard,
  hasPendingDiscard,
  hasUnsavedChanges,
  isLeavingClick,
  registerUnsavedGuard,
  resolvePendingDiscard,
  subscribeUnsaved,
  traversalDelta,
} from "@/lib/unsaved-changes"
import { useRouter } from "@/lib/use-router"

/** The parts of the Navigation API used here (not in every TS DOM lib yet). */
interface NavigationLike {
  currentEntry: { index: number } | null
  addEventListener(
    type: "currententrychange",
    listener: (e: Event & { navigationType?: string | null }) => void
  ): void
  removeEventListener(
    type: "currententrychange",
    listener: (e: Event & { navigationType?: string | null }) => void
  ): void
}

function navigationApi(): NavigationLike | null {
  return (
    (window as unknown as { navigation?: NavigationLike }).navigation ?? null
  )
}

/**
 * Mounted once in the dashboard layout. While an editor reports unsaved
 * changes (`useUnsavedChanges`), it:
 * - asks the browser's native "Leave site?" on reload, tab close or a typed URL
 *   (`beforeunload`);
 * - stops plain clicks on in-app links in the capture phase (before Next's
 *   `Link` and the progress bar see them) and asks with a dialog; Discard
 *   replays the same click, so `Link` semantics (replace, scroll) are kept;
 * - catches browser back/forward (`popstate` in the capture phase, ahead of
 *   the App Router's own listener), steps the history back to where it was and
 *   asks; Discard repeats the step and lets the router handle it.
 * Guarded tab switches and `router.push/replace` from `@/lib/use-router` ask
 * through `confirmDiscard` and use the same dialog.
 */
export function UnsavedChangesGuard() {
  const t = useTranslations("common.unsavedChanges")
  const router = useRouter()
  const open = useSyncExternalStore(
    subscribeUnsaved,
    hasPendingDiscard,
    () => false
  )

  useEffect(() => {
    const unregister = registerUnsavedGuard()

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges()) return
      e.preventDefault()
      // Older browsers need a value; the text itself is never shown.
      e.returnValue = ""
    }

    let replaying = false
    const onClick = (e: MouseEvent) => {
      if (replaying || !hasUnsavedChanges()) return
      const anchor = (e.target as Element | null)?.closest?.(
        "a[href]"
      ) as HTMLAnchorElement | null
      if (!anchor) return
      const leaving = isLeavingClick(
        {
          button: e.button,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          defaultPrevented: e.defaultPrevented,
          target: anchor.getAttribute("target") ?? "",
          hasDownload: anchor.hasAttribute("download"),
          href: anchor.href,
        },
        window.location.href
      )
      if (!leaving) return
      e.preventDefault()
      e.stopPropagation()
      const href = anchor.href
      confirmDiscard(() => {
        if (anchor.isConnected) {
          replaying = true
          try {
            anchor.click()
          } finally {
            replaying = false
          }
        } else {
          router.push(href)
        }
      })
    }

    // Back/forward. The browser has already moved when `popstate` fires, so
    // the step is undone (its own popstate is swallowed too) and repeated
    // only after Discard.
    const nav = navigationApi()
    let lastIndex = nav?.currentEntry?.index ?? null
    let undoing = false
    let letThrough = false
    const onEntryChange = (e: Event & { navigationType?: string | null }) => {
      if (e.navigationType !== "traverse") {
        lastIndex = nav?.currentEntry?.index ?? null
      }
    }
    const onPopState = (e: PopStateEvent) => {
      const index = nav?.currentEntry?.index ?? null
      if (undoing) {
        undoing = false
        lastIndex = index
        e.stopImmediatePropagation()
        return
      }
      if (letThrough || !hasUnsavedChanges()) {
        letThrough = false
        lastIndex = index
        return
      }
      const delta = traversalDelta(lastIndex, index)
      if (delta === 0) return
      e.stopImmediatePropagation()
      undoing = true
      window.history.go(-delta)
      confirmDiscard(() => {
        letThrough = true
        window.history.go(delta)
      })
    }

    window.addEventListener("beforeunload", onBeforeUnload)
    window.addEventListener("click", onClick, true)
    window.addEventListener("popstate", onPopState, true)
    nav?.addEventListener("currententrychange", onEntryChange)
    return () => {
      unregister()
      window.removeEventListener("beforeunload", onBeforeUnload)
      window.removeEventListener("click", onClick, true)
      window.removeEventListener("popstate", onPopState, true)
      nav?.removeEventListener("currententrychange", onEntryChange)
    }
  }, [router])

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resolvePendingDiscard(false)
      }}
      title={t("title")}
      description={t("description")}
      cancelLabel={t("stay")}
      confirmLabel={t("discard")}
      onConfirm={async () => {
        resolvePendingDiscard(true)
      }}
    />
  )
}
