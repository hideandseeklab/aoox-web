import { BORDER, BORDER_STRONG, GLYPH, SURFACE, type IllustrationProps } from "./tokens"

export function ProjectsIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 300 210" aria-hidden="true" focusable="false" className={className}>
      <circle cx="48" cy="46" r="5" fill="#f59e0b" />
      <circle cx="262" cy="64" r="4" fill="#f472b6" />
      <circle cx="238" cy="178" r="6" fill="#38bdf8" />
      <circle cx="58" cy="168" r="3" fill="#f472b6" />
      <path d="M262 30 l0 12 M256 36 l12 0" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M30 108 l0 10 M25 113 l10 0" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      <rect x="86" y="44" width="128" height="96" rx="12" fill={SURFACE} stroke={BORDER} strokeWidth="1" transform="rotate(-7 150 92)" />
      <rect x="86" y="44" width="128" height="96" rx="12" fill={SURFACE} stroke={BORDER} strokeWidth="1" transform="rotate(5 150 92)" />
      <rect x="86" y="44" width="128" height="104" rx="12" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" strokeDasharray="6 6" />
      <rect x="102" y="62" width="44" height="7" rx="3.5" fill={BORDER_STRONG} />
      <rect x="102" y="78" width="72" height="5" rx="2.5" fill={BORDER} />
      <rect x="102" y="90" width="58" height="5" rx="2.5" fill={BORDER} />
      <rect x="102" y="114" width="16" height="16" rx="4" fill="#f59e0b" opacity="0.25" />
      <rect x="124" y="114" width="16" height="16" rx="4" fill="#f472b6" opacity="0.25" />
      <rect x="146" y="114" width="16" height="16" rx="4" fill="#38bdf8" opacity="0.25" />
      <circle cx="204" cy="140" r="26" fill="#84cc16" />
      <path d="M204 128 l0 24 M192 140 l24 0" stroke={GLYPH} strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  )
}
