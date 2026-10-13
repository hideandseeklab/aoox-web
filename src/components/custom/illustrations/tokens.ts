/**
 * Theme-aware paints for the empty-state illustrations. They resolve through
 * the CSS variables of globals.css, so light and dark mode both work.
 */
export const SURFACE = "var(--muted)"
export const BORDER = "var(--border)"
export const BORDER_STRONG =
  "color-mix(in oklab, var(--muted-foreground) 45%, transparent)"
export const GLYPH = "#0c1013"

export type IllustrationProps = { className?: string }
