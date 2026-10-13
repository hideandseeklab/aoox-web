import { BORDER, BORDER_STRONG, SURFACE, type IllustrationProps } from "./tokens"

/** Amber accent on purpose: this state needs attention. */
export function MaintenanceIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 300 210" aria-hidden="true" focusable="false" className={className}>
      <circle cx="48" cy="48" r="4" fill="#f472b6" />
      <circle cx="262" cy="70" r="5" fill="#38bdf8" />
      <circle cx="52" cy="170" r="5" fill="#f59e0b" />
      <path d="M256 168 l0 12 M250 174 l12 0" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="70" y="36" width="150" height="112" rx="12" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" />
      <rect x="88" y="56" width="52" height="7" rx="3.5" fill={BORDER_STRONG} />
      <rect x="88" y="72" width="96" height="5" rx="2.5" fill={BORDER} />
      <rect x="88" y="84" width="76" height="5" rx="2.5" fill={BORDER} />
      <rect x="88" y="104" width="114" height="26" rx="6" fill="#f59e0b" opacity="0.18" />
      <path d="M96 117 l10 0 M114 117 l10 0 M132 117 l10 0 M150 117 l10 0 M168 117 l10 0 M186 117 l8 0" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round" />
      <path d="M214 104 l-22 70 l44 0 z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="3" strokeLinejoin="round" />
      <path d="M205 132 l18 0 M200 150 l28 0" stroke={SURFACE} strokeWidth="6" />
      <rect x="184" y="172" width="60" height="8" rx="3" fill={BORDER_STRONG} />
    </svg>
  )
}
