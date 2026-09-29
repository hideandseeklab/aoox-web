"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { isNavigationTarget, NAV_START_EVENT } from "@/lib/nav-progress"

/** Fast navigations never flash the bar: it only appears after this delay. */
const SHOW_DELAY_MS = 150
/** Safety net: a navigation that never lands (cancelled, failed) must not leave the bar hanging. */
const MAX_MS = 15_000
const TRICKLE_MS = 200
const SETTLE_POLL_MS = 100
const FADE_MS = 250

type Phase = "idle" | "waiting" | "running" | "finishing"

/**
 * Thin top bar (lime `--primary`) shown while a page navigation is in flight.
 *
 * Starts on: a click on an internal `<a>` that Next's `Link` handles,
 * `router.push/replace` via `useRouter` from `@/lib/use-router`, and any route
 * change that lands on a visible loading skeleton without either of those
 * (browser back/forward). Never on `router.refresh()` — a refresh
 * keeps the same path/query, so polling (projects auto-refresh, deploy panel,
 * live metrics…) is invisible to it by construction.
 *
 * Finishes when the pathname/query has changed AND no route-level skeleton
 * (`loading.tsx` root, marked `data-route-loading`) is on screen any more, i.e. when
 * the new page's content has actually arrived, not merely when its skeleton did.
 *
 * Decorative (`aria-hidden`): Next already announces route changes to screen
 * readers, and a progress element that appears/disappears on every click
 * would only add noise. Under `prefers-reduced-motion` the bar is a static
 * full-width line — no trickle, no width animation.
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const key = search ? `${pathname}?${search}` : pathname

  const [bar, setBar] = useState({ visible: false, width: 0 })
  const phase = useRef<Phase>("idle")
  const keyRef = useRef(key)
  const startKey = useRef(key)
  // Set when the route had already changed by the time tracking began (back/forward).
  const landed = useRef(false)
  const timers = useRef<{
    cap?: ReturnType<typeof setTimeout>
    fade?: ReturnType<typeof setTimeout>
    settle?: ReturnType<typeof setInterval>
    show?: ReturnType<typeof setTimeout>
    trickle?: ReturnType<typeof setInterval>
  }>({})
  const controls = useRef<{ arm: (immediate?: boolean) => void; finish: () => void; start: (alreadyLanded?: boolean) => void }>({
    arm: () => {},
    finish: () => {},
    start: () => {},
  })

  useEffect(() => {
    controls.current = {
      // Poll until the new route is committed AND its `loading.tsx` skeleton has left the screen.
      arm(immediate = true) {
        clearInterval(timers.current.settle)
        const check = () => {
          if (phase.current !== "waiting" && phase.current !== "running") return
          if (!landed.current && keyRef.current === startKey.current) return
          // React keeps a resolved Suspense fallback in the DOM as `display: none`,
          // so "present" isn't enough — only a *visible* skeleton means still loading.
          const loading = [...document.querySelectorAll("[data-route-loading]")].some(
            (el) => el.getClientRects().length > 0,
          )
          if (!loading) controls.current.finish()
        }
        timers.current.settle = setInterval(check, SETTLE_POLL_MS)
        if (immediate) check()
      },
      start(alreadyLanded = false) {
        if (phase.current !== "idle") return
        phase.current = "waiting"
        startKey.current = keyRef.current
        landed.current = alreadyLanded
        // first look one tick later: the restored route may not be committed yet
        if (alreadyLanded) controls.current.arm(false)
        timers.current.show = setTimeout(() => {
          phase.current = "running"
          const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
          setBar({ visible: true, width: reduced ? 100 : 12 })
          if (!reduced) {
            timers.current.trickle = setInterval(() => {
              setBar((b) => ({ ...b, width: b.width + (90 - b.width) * 0.08 }))
            }, TRICKLE_MS)
          }
        }, SHOW_DELAY_MS)
        timers.current.cap = setTimeout(() => controls.current.finish(), MAX_MS)
      },
      finish() {
        const t = timers.current
        clearTimeout(t.show)
        clearTimeout(t.cap)
        clearInterval(t.trickle)
        clearInterval(t.settle)
        if (phase.current === "running") {
          phase.current = "finishing"
          setBar({ visible: true, width: 100 })
          t.fade = setTimeout(() => {
            setBar({ visible: false, width: 0 })
            phase.current = "idle"
          }, FADE_MS)
        } else if (phase.current === "waiting") {
          phase.current = "idle"
        }
      },
    }

    const start = () => controls.current.start()

    const onClick = (e: MouseEvent) => {
      // Only clicks that a `Link` turned into a client-side navigation: it
      // calls preventDefault(). Plain, modified, or new-tab clicks fall through.
      if (!e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!anchor || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return
      if (isNavigationTarget(anchor.href)) start()
    }
    document.addEventListener("click", onClick)
    window.addEventListener(NAV_START_EVENT, start)
    return () => {
      document.removeEventListener("click", onClick)
      window.removeEventListener(NAV_START_EVENT, start)
    }
  }, [])

  // The route changed: wait until the page content (not just its skeleton) is there.
  useEffect(() => {
    keyRef.current = key
    if (phase.current === "waiting" || phase.current === "running") {
      controls.current.arm()
    } else if (
      phase.current === "idle" &&
      [...document.querySelectorAll("[data-route-loading]")].some((el) => el.getClientRects().length > 0)
    ) {
      // A navigation we didn't see start — browser back/forward: Next commits the restored
      // route (and its skeleton) before any handler of ours can run — and the content
      // isn't in yet. Track it from here.
      controls.current.start(true)
    }
  }, [key])

  useEffect(
    () => () => {
      const t = timers.current
      clearTimeout(t.show)
      clearTimeout(t.cap)
      clearTimeout(t.fade)
      clearInterval(t.trickle)
      clearInterval(t.settle)
    },
    [],
  )

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]">
      <div
        className="h-full bg-primary shadow-[0_0_8px_var(--primary)] transition-[width,opacity] duration-200 ease-out motion-reduce:transition-none"
        style={{ opacity: bar.visible ? 1 : 0, width: `${bar.width}%` }}
      />
    </div>
  )
}
