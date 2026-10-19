"use client"

import { type ComponentProps, useEffect, useRef, useState } from "react"
import { cn } from "cn"
import { TabsList } from "@/components/ui/tabs"

/**
 * The shadcn `TabsList` inside a wrapper that lets a strip with many tabs scroll on its own on a
 * narrow screen instead of widening the whole page (`w-fit` grows to the sum of the tabs). The
 * scrollbar is hidden: the cut-off tab at the edge hints at it. The strip has no background; a
 * full-width bottom border runs under it and the active `PageTabsTrigger` draws its accent
 * underline over that border (the scroller overlaps the border by 1px so the underline is not
 * clipped). On mount the active tab is scrolled into view, so a strip that opens on a tab near
 * its end (e.g. `production`) does not hide it behind the edge.
 */
const FADE = { background: "from-background", card: "from-card" } as const

export function ScrollableTabsList({
  className,
  fade = "background",
  wrapOnPhone = false,
  ...props
}: ComponentProps<typeof TabsList> & {
  /** Surface the strip sits on, so the edge fade blends in (page or card). */
  fade?: "background" | "card"
  /**
   * Below `sm` the tabs wrap onto further lines instead of scrolling sideways. For a strip whose
   * every tab matters (environments: the one you need may be the last), so none is hidden behind
   * the edge. From `sm` up it scrolls as usual.
   */
  wrapOnPhone?: boolean
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  // Fade edges tell the user there is more to scroll to.
  const [edges, setEdges] = useState({ left: false, right: false })
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const update = () => {
      const left = scroller.scrollLeft > 1
      const right =
        scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1
      setEdges((prev) =>
        prev.left === left && prev.right === right ? prev : { left, right }
      )
    }
    // Only the strip scrolls (never the page): bring the active tab fully into view.
    const reveal = () => {
      const active = scroller.querySelector<HTMLElement>(
        '[data-state="active"]'
      )
      if (!active) return
      const a = active.getBoundingClientRect()
      const s = scroller.getBoundingClientRect()
      if (a.right > s.right) scroller.scrollLeft += a.right - s.right + 16
      else if (a.left < s.left) scroller.scrollLeft -= s.left - a.left + 16
    }
    reveal()
    update()
    scroller.addEventListener("scroll", update, { passive: true })
    const resize = new ResizeObserver(update)
    resize.observe(scroller)
    const list = scroller.firstElementChild
    if (list) resize.observe(list)
    // The active tab changes through an attribute, not a re-mount.
    const mutations = new MutationObserver(() => {
      reveal()
      update()
    })
    mutations.observe(scroller, {
      attributes: true,
      attributeFilter: ["data-state"],
      subtree: true,
    })
    return () => {
      scroller.removeEventListener("scroll", update)
      resize.disconnect()
      mutations.disconnect()
    }
  }, [])
  return (
    <div className="relative max-w-full border-b border-border group-data-vertical/tabs:border-b-0">
      {edges.left && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r to-transparent",
            FADE[fade]
          )}
        />
      )}
      {edges.right && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l to-transparent",
            FADE[fade]
          )}
        />
      )}
      <div
        ref={scrollerRef}
        className="-mb-px max-w-full [scrollbar-width:none] overflow-x-auto pb-px group-data-vertical/tabs:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        <TabsList
          className={cn(
            "justify-start gap-1 rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto",
            wrapOnPhone && "max-sm:flex-wrap",
            className
          )}
          {...props}
        />
      </div>
    </div>
  )
}
