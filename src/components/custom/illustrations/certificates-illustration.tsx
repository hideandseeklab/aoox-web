import { BORDER, BORDER_STRONG, GLYPH, SURFACE, type IllustrationProps } from "./tokens"

/** A certificate with a ribboned seal on a dashed card, with a plus badge. */
export function CertificatesIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 300 210" aria-hidden="true" focusable="false" className={className}>
      <circle cx="48" cy="46" r="5" fill="#38bdf8" />
      <circle cx="262" cy="64" r="4" fill="#f59e0b" />
      <circle cx="238" cy="180" r="6" fill="#f472b6" />
      <circle cx="58" cy="168" r="3" fill="#f59e0b" />
      <path d="M262 30 l0 12 M256 36 l12 0" stroke="#f472b6" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M30 108 l0 10 M25 113 l10 0" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      <rect x="86" y="44" width="128" height="96" rx="12" fill={SURFACE} stroke={BORDER} strokeWidth="1" transform="rotate(-7 150 92)" />
      <rect x="86" y="48" width="128" height="104" rx="12" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" strokeDasharray="6 6" />
      <rect x="102" y="64" width="52" height="7" rx="3.5" fill={BORDER_STRONG} />
      <rect x="102" y="80" width="80" height="5" rx="2.5" fill={BORDER} />
      <rect x="102" y="92" width="62" height="5" rx="2.5" fill={BORDER} />
      <path d="M116 128 l-5 16 l6 -3 l4 5 l3 -16 z" fill="#f472b6" opacity="0.6" />
      <path d="M128 128 l5 16 l-6 -3 l-4 5 l-3 -16 z" fill="#f472b6" opacity="0.6" />
      <circle cx="122" cy="122" r="13" fill="#f59e0b" fillOpacity="0.35" stroke="#f59e0b" strokeWidth="2" />
      <circle cx="122" cy="122" r="6" fill="#f59e0b" />
      <path d="M146 126 q5 -10 10 0 t10 0" stroke={BORDER_STRONG} strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="204" cy="140" r="26" fill="#84cc16" />
      <path d="M204 128 l0 24 M192 140 l24 0" stroke={GLYPH} strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  )
}
