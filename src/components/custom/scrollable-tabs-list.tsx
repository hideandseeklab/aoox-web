"use client"

import { type ComponentProps, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "cn"
import { TabsList } from "@/components/ui/tabs"

/**
 * The shadcn `TabsList` inside a wrapper that lets a strip with many tabs scroll on its own on a
 * narrow screen instead of widening the whole page (`w-fit` grows to the sum of the tabs). The
 * scrollbar is hidden: an edge fade with a small chevron (mouse hint, hidden from screen readers) marks each side that has more, and the active tab is revealed with room for its neighbour to peek out. The strip has no background; a
 * full-width bottom border runs under it and the active `PageTabsTrigger` draws its accent
 * underline over that border (the scroller overlaps the border by 1px so the underline is not
 * clipped). On mount the active tab is scrolled into view, so a strip that opens on a tab near
 * its end (e.g. `production`) does not hide it behind the edge.
 */
const REVEAL_MARGIN = 40
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
      // Leave room for the edge fade so the neighbouring tab peeks out as a hint.
      if (a.right > s.right - REVEAL_MARGIN)
        scroller.scrollLeft += a.right - s.right + REVEAL_MARGIN
      else if (a.left < s.left + REVEAL_MARGIN)
        scroller.scrollLeft -= s.left - a.left + REVEAL_MARGIN
    }
    reveal()
    update()
    scroller.addEventListener("scroll", update, { passive: true })
    // A late font or a width change (sidebar toggle, rotation) can push the active tab out of view.
    const resize = new ResizeObserver(() => {
      reveal()
      update()
    })
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
  const scrollByPage = (direction: -1 | 1) =>
    scrollerRef.current?.scrollBy({
      left: direction * scrollerRef.current.clientWidth * 0.6,
      behavior: "smooth",
    })
  return (
    <div className="relative max-w-full border-b border-border group-data-vertical/tabs:border-b-0">
      {(["left", "right"] as const).map(
        (side) =>
          edges[side] && (
            <div
              key={side}
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-0 z-10 flex w-10 items-center from-60% to-transparent",
                side === "left"
                  ? "left-0 justify-start bg-gradient-to-r"
                  : "right-0 justify-end bg-gradient-to-l",
                FADE[fade]
              )}
            >
              {/* Mouse hint only: keyboard users move with the arrow keys, screen readers read the tablist. */}
              <button
                type="button"
                tabIndex={-1}
                onClick={() => scrollByPage(side === "left" ? -1 : 1)}
                className="pointer-events-auto flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {side === "left" ? (
                  <ChevronLeft className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>
            </div>
          )
      )}
      <div
        ref={scrollerRef}
        className="-mb-px max-w-full [scrollbar-width:none] overflow-x-auto pb-px group-data-vertical/tabs:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        <TabsList
          className={cn(
            "justify-start gap-0.5 rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto",
            wrapOnPhone && "max-sm:flex-wrap",
            className
          )}
          {...props}
        />
      </div>
    </div>
  )
}
