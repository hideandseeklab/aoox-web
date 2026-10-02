import { ArrowRight, ChevronRight } from "lucide-react"

/**
 * The arrow between the steps of a navigation path or a flow written in
 * running text ("Settings → Audit log", "284 s → 54 s"), drawn as a small
 * chevron that sits on the text baseline instead of a `→` glyph (whose shape
 * and spacing depend on the font).
 *
 * A visually hidden "→" travels with it: `sr-only` text is still read by
 * screen readers and still ends up in the clipboard when the sentence is
 * selected and copied (a copied path reads "Settings → Audit log", not
 * "SettingsAudit log"). "→" rather than ">" (which reads as "greater than"):
 * it is what the docs and the panel's plain-text messages already use. The
 * component brings its own spaces — those are what separates the chevron from
 * the words on screen and keeps the copied text spaced — so write a path
 * without spaces around it: `Settings<PathArrow />Audit log`.
 */
// The `relative` wrapper is load-bearing: `sr-only` is `position: absolute`, and an
// absolutely positioned box is only clipped by a scrolling ancestor (a table
// wrapper with `overflow-x-auto`) when that ancestor is its containing block —
// otherwise a hidden arrow in a wide table cell sat far off to the right and
// made the whole page scroll sideways.
export function PathArrow() {
  return (
    <>
      {" "}
      <span className="relative">
        <span className="sr-only">→</span>
        <ChevronRight
          aria-hidden="true"
          className="inline-block size-[0.9em] shrink-0 align-[-0.1em]"
        />
      </span>{" "}
    </>
  )
}

/**
 * The trailing arrow of a link or button ("Lihat audit log →"): decorative
 * (the label already says where it goes) and nudges right on hover. Must sit
 * inside a `Button` (which is the `group/button` the hover reacts to).
 */
export function LinkArrow() {
  return (
    <ArrowRight
      aria-hidden="true"
      className="ml-1 inline-block size-[1em] shrink-0 align-[-0.125em] transition-transform group-hover/button:translate-x-0.5"
    />
  )
}
