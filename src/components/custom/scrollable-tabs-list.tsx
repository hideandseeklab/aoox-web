"use client"

import { type ComponentProps, useEffect, useRef } from "react"
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
export function ScrollableTabsList({
  className,
  ...props
}: ComponentProps<typeof TabsList>) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const scroller = scrollerRef.current
    const active = scroller?.querySelector<HTMLElement>('[data-state="active"]')
    if (!scroller || !active) return
    // Only the strip scrolls (never the page): align the active tab's right edge when it is cut off.
    const overflow =
      active.getBoundingClientRect().right -
      scroller.getBoundingClientRect().right
    if (overflow > 0) scroller.scrollLeft += overflow
  }, [])
  return (
    <div className="max-w-full border-b border-border group-data-vertical/tabs:border-b-0">
      <div
        ref={scrollerRef}
        className="-mb-px max-w-full [scrollbar-width:none] overflow-x-auto pb-px group-data-vertical/tabs:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        <TabsList
          className={cn(
            "justify-start gap-1 rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto",
            className
          )}
          {...props}
        />
      </div>
    </div>
  )
}
