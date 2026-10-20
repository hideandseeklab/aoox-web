import type { ComponentProps } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "cn"
import { TabsTrigger } from "@/components/ui/tabs"

/**
 * Tab for a page-level strip (`ScrollableTabsList`): a small icon next to the label, muted when
 * inactive, and a 2px accent underline when active that sits on the strip's bottom border. The
 * classes override the shadcn trigger, which marks the active tab with `data-active` (Radix sets
 * `data-state="active"`) and draws its own underline only for the `line` variant.
 */
export function PageTabsTrigger({
  icon: Icon,
  className,
  children,
  ...props
}: ComponentProps<typeof TabsTrigger> & { icon: LucideIcon }) {
  return (
    <TabsTrigger
      className={cn(
        "h-auto flex-none gap-1.5 rounded-md border-transparent bg-transparent px-2.5 py-2.5 text-[13px] text-muted-foreground shadow-none hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground dark:border-transparent dark:bg-transparent dark:text-muted-foreground dark:hover:text-foreground dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-foreground data-active:border-transparent data-active:bg-transparent dark:data-active:border-transparent dark:data-active:bg-transparent [&_svg:not([class*='size-'])]:size-4",
        "after:bg-primary group-data-horizontal/tabs:after:bottom-[-1px] group-data-horizontal/tabs:after:h-0.5 data-[state=active]:after:opacity-100",
        className
      )}
      {...props}
    >
      <Icon aria-hidden />
      {children}
    </TabsTrigger>
  )
}
