import { BORDER, BORDER_STRONG, GLYPH, SURFACE, type IllustrationProps } from "./tokens"

export function DeploymentsIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 300 210" aria-hidden="true" focusable="false" className={className}>
      <circle cx="44" cy="52" r="5" fill="#f59e0b" />
      <circle cx="264" cy="150" r="5" fill="#38bdf8" />
      <circle cx="56" cy="176" r="3" fill="#f472b6" />
      <path d="M258 34 l0 12 M252 40 l12 0" stroke="#f472b6" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="70" y="36" width="160" height="136" rx="12" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" />
      <line x1="98" y1="62" x2="98" y2="150" stroke={BORDER_STRONG} strokeWidth="2" strokeDasharray="4 5" />
      <circle cx="98" cy="64" r="7" fill={SURFACE} stroke="#f59e0b" strokeWidth="2.5" />
      <rect x="114" y="58" width="70" height="6" rx="3" fill={BORDER_STRONG} />
      <rect x="114" y="69" width="46" height="4" rx="2" fill={BORDER} />
      <circle cx="98" cy="104" r="7" fill={SURFACE} stroke="#f472b6" strokeWidth="2.5" />
      <rect x="114" y="98" width="58" height="6" rx="3" fill={BORDER_STRONG} />
      <rect x="114" y="109" width="38" height="4" rx="2" fill={BORDER} />
      <circle cx="98" cy="144" r="7" fill={SURFACE} stroke="#38bdf8" strokeWidth="2.5" />
      <rect x="114" y="138" width="64" height="6" rx="3" fill={BORDER_STRONG} />
      <rect x="114" y="149" width="42" height="4" rx="2" fill={BORDER} />
      <circle cx="222" cy="166" r="26" fill="#84cc16" />
      <path d="M215 153 l0 26 l20 -13 z" fill={GLYPH} stroke={GLYPH} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  )
}
