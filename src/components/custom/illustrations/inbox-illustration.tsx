import { BORDER, BORDER_STRONG, GLYPH, SURFACE, type IllustrationProps } from "./tokens"

export function InboxIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 300 210" aria-hidden="true" focusable="false" className={className}>
      <circle cx="50" cy="44" r="4" fill="#38bdf8" />
      <circle cx="256" cy="58" r="5" fill="#f59e0b" />
      <circle cx="246" cy="182" r="3" fill="#f472b6" />
      <path d="M40 150 l0 12 M34 156 l12 0" stroke="#f472b6" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="96" y="40" width="108" height="34" rx="8" fill={SURFACE} stroke={BORDER} strokeWidth="1" transform="rotate(-6 150 57)" />
      <rect x="88" y="58" width="124" height="34" rx="8" fill={SURFACE} stroke={BORDER} strokeWidth="1" transform="rotate(4 150 75)" />
      <path d="M70 104 l28 -16 l104 0 l28 16 l0 56 a12 12 0 0 1 -12 12 l-136 0 a12 12 0 0 1 -12 -12 z" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M70 104 l46 0 l8 16 l52 0 l8 -16 l46 0" fill="none" stroke={BORDER_STRONG} strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="128" y="138" width="44" height="6" rx="3" fill={BORDER} />
      <circle cx="214" cy="150" r="24" fill="#84cc16" />
      <path d="M203 150 l8 8 l15 -16" stroke={GLYPH} strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
