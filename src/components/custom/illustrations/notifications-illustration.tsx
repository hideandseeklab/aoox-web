import { BORDER, BORDER_STRONG, GLYPH, SURFACE, type IllustrationProps } from "./tokens"

/** A ringing bell on a dashed card with a message bubble and a plus badge. */
export function NotificationsIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 300 210" aria-hidden="true" focusable="false" className={className}>
      <circle cx="48" cy="40" r="4" fill="#f59e0b" />
      <circle cx="264" cy="70" r="5" fill="#f472b6" />
      <circle cx="240" cy="182" r="4" fill="#38bdf8" />
      <circle cx="52" cy="160" r="5" fill="#f472b6" />
      <path d="M256 28 l0 12 M250 34 l12 0" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M34 124 l0 10 M29 129 l10 0" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <rect x="86" y="44" width="128" height="96" rx="12" fill={SURFACE} stroke={BORDER} strokeWidth="1" transform="rotate(5 150 92)" />
      <rect x="86" y="48" width="128" height="104" rx="12" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" strokeDasharray="6 6" />
      <path d="M150 68 a4 4 0 0 1 4 4 l0 2 a20 20 0 0 1 16 20 l0 14 l6 8 l-52 0 l6 -8 l0 -14 a20 20 0 0 1 16 -20 l0 -2 a4 4 0 0 1 4 -4 z" fill={BORDER} stroke={BORDER_STRONG} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="150" cy="124" r="5" fill="#f59e0b" />
      <path d="M120 84 a32 32 0 0 1 9 -14" stroke="#38bdf8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M180 84 a32 32 0 0 0 -9 -14" stroke="#f472b6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M72 88 l-4 10 l12 -10" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="60" y="60" width="54" height="30" rx="8" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" />
      <rect x="69" y="69" width="30" height="5" rx="2.5" fill={BORDER_STRONG} />
      <rect x="69" y="79" width="20" height="4" rx="2" fill={BORDER} />
      <circle cx="204" cy="140" r="26" fill="#84cc16" />
      <path d="M204 128 l0 24 M192 140 l24 0" stroke={GLYPH} strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  )
}
