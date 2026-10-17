import { BORDER, BORDER_STRONG, GLYPH, SURFACE, type IllustrationProps } from "./tokens"

/** A router node fanning out to three service rows on a dashed card, with a plus badge. */
export function ProxyIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 300 210" aria-hidden="true" focusable="false" className={className}>
      <circle cx="46" cy="50" r="5" fill="#38bdf8" />
      <circle cx="264" cy="60" r="4" fill="#f59e0b" />
      <circle cx="240" cy="182" r="6" fill="#f472b6" />
      <circle cx="60" cy="170" r="3" fill="#f59e0b" />
      <path d="M258 26 l0 12 M252 32 l12 0" stroke="#f472b6" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M28 110 l0 10 M23 115 l10 0" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      <rect x="86" y="44" width="128" height="96" rx="12" fill={SURFACE} stroke={BORDER} strokeWidth="1" transform="rotate(-6 150 92)" />
      <rect x="86" y="48" width="128" height="104" rx="12" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" strokeDasharray="6 6" />
      <path d="M100 98 l14 0" stroke={BORDER_STRONG} strokeWidth="2" strokeLinecap="round" />
      <path d="M138 98 q10 0 14 -22 l6 0 M138 98 l20 0 M138 98 q10 0 14 22 l6 0" stroke={BORDER_STRONG} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="126" cy="98" r="13" fill={BORDER} stroke={BORDER_STRONG} strokeWidth="2" />
      <path d="M120 98 l12 0 M128 93 l5 5 l-5 5" stroke={BORDER_STRONG} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="160" y="70" width="12" height="12" rx="3" fill="#38bdf8" opacity="0.5" />
      <rect x="176" y="73" width="22" height="6" rx="3" fill={BORDER_STRONG} />
      <rect x="160" y="92" width="12" height="12" rx="3" fill="#f59e0b" opacity="0.5" />
      <rect x="176" y="95" width="18" height="6" rx="3" fill={BORDER_STRONG} />
      <rect x="160" y="114" width="12" height="12" rx="3" fill="#f472b6" opacity="0.5" />
      <rect x="176" y="117" width="20" height="6" rx="3" fill={BORDER} />
      <circle cx="204" cy="140" r="26" fill="#84cc16" />
      <path d="M204 128 l0 24 M192 140 l24 0" stroke={GLYPH} strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  )
}
