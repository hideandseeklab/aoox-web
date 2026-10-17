import { BORDER, BORDER_STRONG, GLYPH, SURFACE, type IllustrationProps } from "./tokens"

/** A branch graph and a key on a dashed card, with a plus badge. */
export function GitCredentialsIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 300 210" aria-hidden="true" focusable="false" className={className}>
      <circle cx="46" cy="50" r="5" fill="#f472b6" />
      <circle cx="262" cy="62" r="4" fill="#38bdf8" />
      <circle cx="240" cy="180" r="6" fill="#f59e0b" />
      <circle cx="60" cy="170" r="3" fill="#38bdf8" />
      <path d="M260 28 l0 12 M254 34 l12 0" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M30 110 l0 10 M25 115 l10 0" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
      <rect x="86" y="44" width="128" height="96" rx="12" fill={SURFACE} stroke={BORDER} strokeWidth="1" transform="rotate(-6 150 92)" />
      <rect x="86" y="48" width="128" height="104" rx="12" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" strokeDasharray="6 6" />
      <path d="M110 76 l0 48" stroke={BORDER_STRONG} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M110 116 c0 -14 22 -12 22 -26" stroke="#f472b6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="110" cy="70" r="6" fill={SURFACE} stroke="#f59e0b" strokeWidth="2.5" />
      <circle cx="132" cy="84" r="6" fill={SURFACE} stroke="#f472b6" strokeWidth="2.5" />
      <circle cx="110" cy="130" r="6" fill={SURFACE} stroke="#38bdf8" strokeWidth="2.5" />
      <circle cx="160" cy="98" r="11" fill="none" stroke={BORDER_STRONG} strokeWidth="3" />
      <circle cx="160" cy="98" r="3.5" fill={BORDER_STRONG} />
      <path d="M171 98 l26 0 M189 98 l0 8 M196 98 l0 6" stroke={BORDER_STRONG} strokeWidth="3" strokeLinecap="round" />
      <rect x="148" y="124" width="22" height="5" rx="2.5" fill={BORDER} />
      <circle cx="204" cy="140" r="26" fill="#84cc16" />
      <path d="M204 128 l0 24 M192 140 l24 0" stroke={GLYPH} strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  )
}
