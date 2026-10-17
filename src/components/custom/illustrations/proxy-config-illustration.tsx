import { BORDER, BORDER_STRONG, GLYPH, SURFACE, type IllustrationProps } from "./tokens"

/** A YAML file with indented key rows and a code tag on a dashed card, with a plus badge. */
export function ProxyConfigIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 300 210" aria-hidden="true" focusable="false" className={className}>
      <circle cx="48" cy="48" r="5" fill="#f59e0b" />
      <circle cx="262" cy="62" r="4" fill="#38bdf8" />
      <circle cx="238" cy="182" r="6" fill="#f472b6" />
      <circle cx="60" cy="168" r="3" fill="#38bdf8" />
      <path d="M260 28 l0 12 M254 34 l12 0" stroke="#f472b6" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M30 108 l0 10 M25 113 l10 0" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <rect x="86" y="44" width="128" height="96" rx="12" fill={SURFACE} stroke={BORDER} strokeWidth="1" transform="rotate(-7 150 92)" />
      <rect x="86" y="48" width="128" height="104" rx="12" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" strokeDasharray="6 6" />
      <path d="M104 70 l-6 6 l6 6 M118 70 l6 6 l-6 6 M114 68 l-6 16" stroke={BORDER_STRONG} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="132" y="73" width="38" height="6" rx="3" fill={BORDER_STRONG} />
      <rect x="102" y="94" width="10" height="6" rx="3" fill="#38bdf8" opacity="0.6" />
      <rect x="116" y="94" width="40" height="6" rx="3" fill={BORDER_STRONG} />
      <rect x="112" y="108" width="10" height="6" rx="3" fill="#f59e0b" opacity="0.6" />
      <rect x="126" y="108" width="34" height="6" rx="3" fill={BORDER} />
      <rect x="112" y="122" width="10" height="6" rx="3" fill="#f472b6" opacity="0.6" />
      <rect x="126" y="122" width="26" height="6" rx="3" fill={BORDER} />
      <circle cx="204" cy="140" r="26" fill="#84cc16" />
      <path d="M204 128 l0 24 M192 140 l24 0" stroke={GLYPH} strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  )
}
