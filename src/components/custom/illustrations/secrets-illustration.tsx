import { BORDER, BORDER_STRONG, GLYPH, SURFACE, type IllustrationProps } from "./tokens"

/** A padlock over a masked value on a dashed card, with a plus badge. */
export function SecretsIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 300 210" aria-hidden="true" focusable="false" className={className}>
      <circle cx="50" cy="46" r="4" fill="#f472b6" />
      <circle cx="260" cy="64" r="5" fill="#f59e0b" />
      <circle cx="238" cy="182" r="5" fill="#38bdf8" />
      <circle cx="56" cy="166" r="4" fill="#f59e0b" />
      <path d="M258 28 l0 12 M252 34 l12 0" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 108 l0 10 M27 113 l10 0" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
      <rect x="86" y="44" width="128" height="96" rx="12" fill={SURFACE} stroke={BORDER} strokeWidth="1" transform="rotate(6 150 92)" />
      <rect x="86" y="48" width="128" height="104" rx="12" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" strokeDasharray="6 6" />
      <path d="M136 88 l0 -10 a14 14 0 0 1 28 0 l0 10" stroke={BORDER_STRONG} strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="124" y="86" width="52" height="36" rx="8" fill={BORDER} stroke={BORDER_STRONG} strokeWidth="1.5" />
      <circle cx="150" cy="100" r="5" fill="#f472b6" />
      <rect x="148" y="102" width="4" height="10" rx="2" fill="#f472b6" />
      <rect x="104" y="131" width="72" height="11" rx="5.5" fill={BORDER} />
      <circle cx="115" cy="136.5" r="2" fill={BORDER_STRONG} />
      <circle cx="124" cy="136.5" r="2" fill={BORDER_STRONG} />
      <circle cx="133" cy="136.5" r="2" fill={BORDER_STRONG} />
      <circle cx="142" cy="136.5" r="2" fill={BORDER_STRONG} />
      <circle cx="151" cy="136.5" r="2" fill={BORDER_STRONG} />
      <circle cx="160" cy="136.5" r="2" fill={BORDER_STRONG} />
      <circle cx="204" cy="140" r="26" fill="#84cc16" />
      <path d="M204 128 l0 24 M192 140 l24 0" stroke={GLYPH} strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  )
}
