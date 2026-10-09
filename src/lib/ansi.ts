/**
 * Minimal ANSI parser for log output. It understands the colour/weight
 * sequences (SGR) and throws every other escape sequence and control
 * character away, so the result is plain text plus a few style flags: it is
 * rendered as React text nodes, never as HTML.
 */

export interface AnsiSpan {
  text: string
  /** CSS colour taken from the palettes below (never from the input text). */
  fg?: string
  bold?: boolean
  dim?: boolean
  italic?: boolean
  underline?: boolean
}

export interface AnsiLine {
  spans: AnsiSpan[]
  /** The line without any escape sequences (what search and copy work on). */
  plain: string
}

// Tuned for the dark console surface the log viewer draws on.
const BASE = [
  "#737373",
  "#f87171",
  "#4ade80",
  "#fbbf24",
  "#60a5fa",
  "#c084fc",
  "#22d3ee",
  "#e5e5e5",
]
const BRIGHT = [
  "#a3a3a3",
  "#fca5a5",
  "#86efac",
  "#fcd34d",
  "#93c5fd",
  "#d8b4fe",
  "#67e8f9",
  "#fafafa",
]

function color256(n: number): string | undefined {
  if (!Number.isInteger(n) || n < 0 || n > 255) return undefined
  if (n < 8) return BASE[n]
  if (n < 16) return BRIGHT[n - 8]
  if (n >= 232) {
    const v = 8 + (n - 232) * 10
    return `rgb(${v},${v},${v})`
  }
  const i = n - 16
  const level = (c: number) => (c === 0 ? 0 : 55 + c * 40)
  return `rgb(${level(Math.floor(i / 36))},${level(Math.floor(i / 6) % 6)},${level(i % 6)})`
}

function rgb(r: number, g: number, b: number): string | undefined {
  return [r, g, b].every((c) => Number.isInteger(c) && c >= 0 && c <= 255)
    ? `rgb(${r},${g},${b})`
    : undefined
}

// CSI (colour or not), OSC, two-byte escapes, then stray control characters (tab stays).
const TOKEN = new RegExp(
  [
    String.raw`\u001b\[([0-?]*)[ -/]*([@-~])`,
    String.raw`\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)?`,
    String.raw`\u001b[@-_]`,
    String.raw`[\u0000-\u0008\u000b-\u001f\u007f]`,
  ].join("|"),
  "g"
)

type Style = Omit<AnsiSpan, "text">

function applySgr(style: Style, params: string): Style {
  const codes = params === "" ? [0] : params.split(/[;:]/).map(Number)
  const next = { ...style }
  for (let i = 0; i < codes.length; i++) {
    const n = codes[i]
    if (n === 0) {
      next.fg = undefined
      next.bold = next.dim = next.italic = next.underline = undefined
    } else if (n === 1) next.bold = true
    else if (n === 2) next.dim = true
    else if (n === 3) next.italic = true
    else if (n === 4) next.underline = true
    else if (n === 22) next.bold = next.dim = undefined
    else if (n === 23) next.italic = undefined
    else if (n === 24) next.underline = undefined
    else if (n >= 30 && n <= 37) next.fg = BASE[n - 30]
    else if (n >= 90 && n <= 97) next.fg = BRIGHT[n - 90]
    else if (n === 39) next.fg = undefined
    else if (n === 38 || n === 48) {
      // Extended colour: 5;n or 2;r;g;b. Background (48) is read and dropped.
      const mode = codes[i + 1]
      let colour: string | undefined
      if (mode === 5) {
        colour = color256(codes[i + 2])
        i += 2
      } else if (mode === 2) {
        colour = rgb(codes[i + 2], codes[i + 3], codes[i + 4])
        i += 4
      }
      if (n === 38) next.fg = colour
    }
  }
  return next
}

/** Splits `text` into lines of styled spans. Colour carries over from one line to the next, as in a terminal. */
export function parseAnsi(text: string): AnsiLine[] {
  const out: AnsiLine[] = []
  let style: Style = {}
  for (const raw of text.split("\n")) {
    // A carriage return rewinds the line (progress bars): keep what was written last.
    const cr = raw.replace(/\r+$/, "").split("\r")
    let src = cr[cr.length - 1]
    if (src === "" && cr.length > 1) src = cr[cr.length - 2]
    const spans: AnsiSpan[] = []
    let plain = ""
    let last = 0
    const push = (chunk: string) => {
      if (!chunk) return
      spans.push({ text: chunk, ...style })
      plain += chunk
    }
    TOKEN.lastIndex = 0
    for (let m = TOKEN.exec(src); m; m = TOKEN.exec(src)) {
      push(src.slice(last, m.index))
      last = m.index + m[0].length
      if (m[2] === "m") style = applySgr(style, m[1] ?? "")
    }
    push(src.slice(last))
    out.push({ spans, plain })
  }
  return out
}
