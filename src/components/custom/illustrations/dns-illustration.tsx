import { BORDER, BORDER_STRONG, GLYPH, SURFACE, type IllustrationProps } from "./tokens"

/** A globe next to a short list of DNS records on a dashed card, with a plus badge. */
export function DnsIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 300 210" aria-hidden="true" focusable="false" className={className}>
      <circle cx="44" cy="54" r="5" fill="#f59e0b" />
      <circle cx="264" cy="58" r="4" fill="#38bdf8" />
      <circle cx="240" cy="182" r="6" fill="#f472b6" />
      <circle cx="62" cy="172" r="3" fill="#38bdf8" />
      <path d="M258 26 l0 12 M252 32 l12 0" stroke="#f472b6" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M28 112 l0 10 M23 117 l10 0" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <rect x="86" y="44" width="128" height="96" rx="12" fill={SURFACE} stroke={BORDER} strokeWidth="1" transform="rotate(-6 150 92)" />
      <rect x="86" y="48" width="128" height="104" rx="12" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" strokeDasharray="6 6" />
      <circle cx="124" cy="96" r="22" fill={BORDER} stroke={BORDER_STRONG} strokeWidth="2" />
      <ellipse cx="124" cy="96" rx="9" ry="22" fill="none" stroke={BORDER_STRONG} strokeWidth="1.5" />
      <path d="M102 96 l44 0 M106 84 q18 6 36 0 M106 108 q18 -6 36 0" stroke={BORDER_STRONG} strokeWidth="1.5" fill="none" />
      <rect x="156" y="74" width="14" height="8" rx="4" fill="#f59e0b" opacity="0.5" />
      <rect x="174" y="75" width="26" height="6" rx="3" fill={BORDER_STRONG} />
      <rect x="156" y="92" width="14" height="8" rx="4" fill="#f472b6" opacity="0.5" />
      <rect x="174" y="93" width="20" height="6" rx="3" fill={BORDER_STRONG} />
      <rect x="156" y="110" width="14" height="8" rx="4" fill="#38bdf8" opacity="0.5" />
      <rect x="174" y="111" width="24" height="6" rx="3" fill={BORDER} />
      <circle cx="204" cy="140" r="26" fill="#84cc16" />
      <path d="M204 128 l0 24 M192 140 l24 0" stroke={GLYPH} strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  )
}
