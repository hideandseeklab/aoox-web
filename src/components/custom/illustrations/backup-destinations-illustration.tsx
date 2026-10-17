import { BORDER, BORDER_STRONG, GLYPH, SURFACE, type IllustrationProps } from "./tokens"

/** A disk sending a copy up into a cloud bucket, on a dashed card with a plus badge. */
export function BackupDestinationsIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 300 210" aria-hidden="true" focusable="false" className={className}>
      <circle cx="46" cy="48" r="5" fill="#38bdf8" />
      <circle cx="262" cy="60" r="4" fill="#f472b6" />
      <circle cx="242" cy="180" r="5" fill="#f59e0b" />
      <circle cx="58" cy="170" r="3" fill="#f472b6" />
      <path d="M262 26 l0 12 M256 32 l12 0" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M30 110 l0 10 M25 115 l10 0" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      <rect x="86" y="44" width="128" height="96" rx="12" fill={SURFACE} stroke={BORDER} strokeWidth="1" transform="rotate(-7 150 92)" />
      <rect x="86" y="48" width="128" height="104" rx="12" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" strokeDasharray="6 6" />
      <path d="M124 100 a14 14 0 0 1 2 -28 a20 20 0 0 1 38 -4 a16 16 0 0 1 10 32 z" fill={BORDER} stroke={BORDER_STRONG} strokeWidth="2" strokeLinejoin="round" />
      <path d="M150 126 l0 -30 M141 105 l9 -9 l9 9" stroke="#38bdf8" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="114" y="128" width="58" height="14" rx="4" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" />
      <circle cx="123" cy="135" r="2.5" fill="#f59e0b" />
      <rect x="131" y="133" width="28" height="4" rx="2" fill={BORDER} />
      <circle cx="204" cy="140" r="26" fill="#84cc16" />
      <path d="M204 128 l0 24 M192 140 l24 0" stroke={GLYPH} strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  )
}
