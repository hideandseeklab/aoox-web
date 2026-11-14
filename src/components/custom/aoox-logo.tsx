import { cn } from "@/lib/utils"

/**
 * The aoox mark: a lime chevron on a square #0c1013 tile, the same drawing as
 * the favicon (`icon.svg`). Brand colours are fixed, not theme tokens. In dark
 * mode the tile is almost the page colour, so a faint 1px edge is drawn inside
 * the SVG (an outer ring would be clipped where a parent has overflow hidden,
 * e.g. the collapsed sidebar button, which is exactly the logo's size).
 * Decorative by default (`aria-hidden`): it always sits next to the word "aoox".
 */
export function AooxLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className={cn("size-5 shrink-0", className)}
    >
      <rect width="64" height="64" fill="#0c1013" />
      <path
        d="M21.6 20.6 39.7 29.7Q45 32 39.7 34.3L21.6 43.4"
        fill="none"
        stroke="#84cc16"
        strokeWidth="5.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Centred on the edge, so the outer half is clipped: 1px inside. */}
      <rect
        width="64"
        height="64"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.15"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        className="hidden dark:inline"
      />
    </svg>
  )
}
