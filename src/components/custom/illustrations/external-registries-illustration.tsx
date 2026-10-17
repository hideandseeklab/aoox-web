import { BORDER, BORDER_STRONG, GLYPH, SURFACE, type IllustrationProps } from "./tokens"

/** A cloud above two image layers on a dashed card, with a plus badge. */
export function ExternalRegistriesIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 300 210" aria-hidden="true" focusable="false" className={className}>
      <circle cx="44" cy="52" r="5" fill="#f472b6" />
      <circle cx="264" cy="60" r="4" fill="#f59e0b" />
      <circle cx="242" cy="180" r="5" fill="#38bdf8" />
      <circle cx="58" cy="172" r="3" fill="#f59e0b" />
      <path d="M258 26 l0 12 M252 32 l12 0" stroke="#f472b6" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M28 110 l0 10 M23 115 l10 0" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      <rect x="86" y="44" width="128" height="96" rx="12" fill={SURFACE} stroke={BORDER} strokeWidth="1" transform="rotate(5 150 92)" />
      <rect x="86" y="48" width="128" height="104" rx="12" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" strokeDasharray="6 6" />
      <path d="M128 92 a12 12 0 0 1 2 -24 a17 17 0 0 1 32 -3 a13 13 0 0 1 8 27 z" fill={BORDER} stroke={BORDER_STRONG} strokeWidth="2" strokeLinejoin="round" />
      <path d="M150 96 l0 10" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 4" />
      <rect x="112" y="110" width="76" height="14" rx="5" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" />
      <rect x="112" y="110" width="76" height="14" rx="5" fill="#38bdf8" opacity="0.25" />
      <rect x="112" y="128" width="76" height="14" rx="5" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" />
      <rect x="112" y="128" width="76" height="14" rx="5" fill="#f472b6" opacity="0.25" />
      <rect x="120" y="115" width="28" height="4" rx="2" fill={BORDER_STRONG} />
      <rect x="120" y="133" width="36" height="4" rx="2" fill={BORDER_STRONG} />
      <circle cx="204" cy="140" r="26" fill="#84cc16" />
      <path d="M204 128 l0 24 M192 140 l24 0" stroke={GLYPH} strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  )
}
