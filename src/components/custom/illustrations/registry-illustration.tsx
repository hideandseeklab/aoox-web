import { BORDER, BORDER_STRONG, GLYPH, SURFACE, type IllustrationProps } from "./tokens"

/** Stacked image layers with a tag on a dashed card, with a plus badge. */
export function RegistryIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 300 210" aria-hidden="true" focusable="false" className={className}>
      <circle cx="46" cy="48" r="5" fill="#f59e0b" />
      <circle cx="262" cy="62" r="4" fill="#f472b6" />
      <circle cx="240" cy="180" r="6" fill="#38bdf8" />
      <circle cx="60" cy="170" r="3" fill="#f472b6" />
      <path d="M260 28 l0 12 M254 34 l12 0" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M30 110 l0 10 M25 115 l10 0" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <rect x="86" y="44" width="128" height="96" rx="12" fill={SURFACE} stroke={BORDER} strokeWidth="1" transform="rotate(-6 150 92)" />
      <rect x="86" y="48" width="128" height="104" rx="12" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" strokeDasharray="6 6" />
      <rect x="110" y="110" width="80" height="18" rx="6" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" />
      <rect x="110" y="110" width="80" height="18" rx="6" fill="#f59e0b" opacity="0.25" />
      <rect x="110" y="88" width="80" height="18" rx="6" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" />
      <rect x="110" y="88" width="80" height="18" rx="6" fill="#f472b6" opacity="0.25" />
      <rect x="110" y="66" width="80" height="18" rx="6" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" />
      <rect x="110" y="66" width="80" height="18" rx="6" fill="#38bdf8" opacity="0.25" />
      <rect x="120" y="73" width="30" height="4" rx="2" fill={BORDER_STRONG} />
      <rect x="120" y="95" width="40" height="4" rx="2" fill={BORDER_STRONG} />
      <rect x="120" y="117" width="24" height="4" rx="2" fill={BORDER_STRONG} />
      <rect x="110" y="136" width="36" height="6" rx="3" fill={BORDER} />
      <circle cx="204" cy="140" r="26" fill="#84cc16" />
      <path d="M204 128 l0 24 M192 140 l24 0" stroke={GLYPH} strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  )
}
