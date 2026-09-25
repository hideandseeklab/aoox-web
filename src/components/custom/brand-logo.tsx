import { cn } from "@/lib/utils"

/**
 * The aoox mark: a salmon silhouette on the primary tile. Inline SVG
 * (no asset request, inherits `currentColor`), used in the sidebar header
 * and anywhere else the brand shows up.
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-primary-foreground",
        className
      )}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" className="size-5" fill="currentColor">
        {/* body, head to the left; the tail overlaps it so there is no gap */}
        <path d="M3 16c3.5-6.5 9.5-9.5 17-8.5 3 2 4.5 5 4.5 8.5s-1.5 6.5-4.5 8.5C12.5 25.5 6.5 22.5 3 16z" />
        <path d="M21.5 16c2.5-2.6 5.2-5.4 8.5-7-1.7 2.4-2.5 4.7-2.5 7s.8 4.6 2.5 7c-3.3-1.6-6-4.4-8.5-7z" />
        <path d="M10.5 9.2C12 6.5 14.5 5 17.5 4.8c-1 1.5-1.6 3-1.8 4.6-1.8-.4-3.5-.5-5.2-.2z" />
        <circle cx="8.5" cy="15" r="1.4" fill="var(--primary)" />
      </svg>
    </div>
  )
}
