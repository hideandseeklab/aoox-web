import { BORDER, BORDER_STRONG, GLYPH, SURFACE, type IllustrationProps } from "./tokens"

/** Stacked `KEY=VALUE` cards with environment tabs and a plus badge. */
export function VariablesIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 300 210" aria-hidden="true" focusable="false" className={className}>
      <circle cx="44" cy="52" r="5" fill="#38bdf8" />
      <circle cx="264" cy="58" r="4" fill="#f59e0b" />
      <circle cx="240" cy="182" r="6" fill="#f472b6" />
      <circle cx="62" cy="172" r="3" fill="#f59e0b" />
      <path d="M258 26 l0 12 M252 32 l12 0" stroke="#f472b6" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M28 112 l0 10 M23 117 l10 0" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <rect x="84" y="40" width="132" height="100" rx="12" fill={SURFACE} stroke={BORDER} strokeWidth="1" transform="rotate(-6 150 90)" />
      <rect x="84" y="48" width="132" height="104" rx="12" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" />
      <rect x="96" y="58" width="30" height="10" rx="5" fill="#84cc16" opacity="0.35" />
      <rect x="130" y="58" width="30" height="10" rx="5" fill={BORDER} />
      <rect x="164" y="58" width="30" height="10" rx="5" fill={BORDER} />
      <rect x="96" y="80" width="36" height="6" rx="3" fill={BORDER_STRONG} />
      <rect x="138" y="80" width="10" height="6" rx="3" fill="#38bdf8" opacity="0.5" />
      <rect x="154" y="80" width="46" height="6" rx="3" fill={BORDER} />
      <rect x="96" y="96" width="28" height="6" rx="3" fill={BORDER_STRONG} />
      <rect x="130" y="96" width="10" height="6" rx="3" fill="#38bdf8" opacity="0.5" />
      <rect x="146" y="96" width="54" height="6" rx="3" fill={BORDER} />
      <rect x="96" y="112" width="42" height="6" rx="3" fill={BORDER_STRONG} />
      <rect x="144" y="112" width="10" height="6" rx="3" fill="#38bdf8" opacity="0.5" />
      <rect x="160" y="112" width="34" height="6" rx="3" fill={BORDER} />
      <rect x="96" y="128" width="24" height="6" rx="3" fill={BORDER_STRONG} />
      <rect x="126" y="128" width="10" height="6" rx="3" fill="#38bdf8" opacity="0.5" />
      <rect x="142" y="128" width="40" height="6" rx="3" fill={BORDER} />
      <circle cx="208" cy="148" r="26" fill="#84cc16" />
      <path d="M208 136 l0 24 M196 148 l24 0" stroke={GLYPH} strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  )
}
