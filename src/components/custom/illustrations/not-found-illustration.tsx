import { BORDER, BORDER_STRONG, GLYPH, SURFACE, type IllustrationProps } from "./tokens"

export function NotFoundIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 300 210" aria-hidden="true" focusable="false" className={className}>
      <circle cx="46" cy="60" r="5" fill="#f472b6" />
      <circle cx="260" cy="44" r="4" fill="#38bdf8" />
      <circle cx="258" cy="172" r="5" fill="#f59e0b" />
      <path d="M44 158 l0 12 M38 164 l12 0" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="66" y="38" width="168" height="134" rx="12" fill={SURFACE} stroke={BORDER_STRONG} strokeWidth="1.5" />
      <line x1="66" y1="62" x2="234" y2="62" stroke={BORDER} strokeWidth="1.5" />
      <circle cx="82" cy="50" r="3.5" fill="#f472b6" />
      <circle cx="94" cy="50" r="3.5" fill="#f59e0b" />
      <circle cx="106" cy="50" r="3.5" fill="#84cc16" />
      <rect x="120" y="46" width="96" height="8" rx="4" fill={BORDER} />
      <text
        x="150"
        y="122"
        textAnchor="middle"
        fill="currentColor"
        className="text-foreground"
        style={{ fontSize: 42, fontWeight: 600, letterSpacing: -1 }}
      >
        404
      </text>
      <path d="M92 146 l30 0" stroke={BORDER_STRONG} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M134 146 l10 0" stroke={BORDER_STRONG} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 6" />
      <path d="M156 146 l30 0" stroke={BORDER_STRONG} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="222" cy="164" r="24" fill="#84cc16" />
      <path d="M215 157 a7 7 0 1 1 9 7 q-2 1 -2 4" stroke={GLYPH} strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="222" cy="175" r="2.6" fill={GLYPH} />
    </svg>
  )
}
