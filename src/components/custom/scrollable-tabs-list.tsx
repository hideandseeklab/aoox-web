import type { ComponentProps } from "react"
import { TabsList } from "@/components/ui/tabs"

/**
 * The shadcn `TabsList` inside a wrapper that lets a strip with many tabs scroll on its own on a
 * narrow screen instead of widening the whole page (`w-fit` grows to the sum of the tabs). The
 * scrollbar is hidden: the cut-off tab at the edge hints at it.
 */
export function ScrollableTabsList(props: ComponentProps<typeof TabsList>) {
  return (
    <div className="max-w-full [scrollbar-width:none] overflow-x-auto group-data-vertical/tabs:overflow-visible [&::-webkit-scrollbar]:hidden">
      <TabsList {...props} />
    </div>
  )
}
