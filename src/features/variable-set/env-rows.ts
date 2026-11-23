/**
 * Row model of the `KEY=VALUE` env editor, kept free of React so it can be
 * checked from a plain script. The text is split into:
 *
 * - `var` rows: one `NAME=value` line plus its **note**, the `#` lines
 *   directly above it (no blank line in between), the same rule as the API's
 *   `extractNotes` (aoox-api `env-text.ts`);
 * - `block` rows: everything else that is not blank, kept verbatim
 *   (standalone comments such as section headers, and malformed lines).
 *
 * Every row remembers how many blank lines came before it, so Text -> Rows
 * -> Text gives the same text back (trailing blank lines and spaces around
 * the variable name are the only things not kept). Notes and blocks the user
 * did not touch are written back with their original lines.
 */

export interface VarRow {
  kind: "var"
  id: number
  key: string
  value: string
  /** The note as shown and edited (one `#` and one space removed per line). */
  note: string
  /** The comment lines the note came from, written back while `note` is unchanged. */
  noteSource: string[]
  blankBefore: number
}

export interface BlockRow {
  kind: "block"
  id: number
  /** Standalone comment lines (and malformed lines read from the text). */
  text: string
  /** The lines as read, written back while `text` is unchanged. */
  source: string
  blankBefore: number
}

export type EnvRow = VarRow | BlockRow

/** Longest note the API keeps; a longer block is cut there. */
export const NOTE_MAX = 1000

const BOM = String.fromCharCode(0xfeff)

/** Note text of comment lines: the same rule as the API's `extractNotes`. */
export function noteOf(lines: string[]): string {
  return lines
    .map((l) => l.trim().slice(1).replace(/^ /, "").trimEnd())
    .join("\n")
    .replace(/^\n+/, "")
    .trimEnd()
}

/** A note as `# ` lines (an empty line inside the note becomes a bare `#`). */
export function noteLines(note: string): string[] {
  const clean = note.replace(/\r\n/g, "\n").replace(/^\n+/, "").trimEnd()
  if (!clean) return []
  return clean.split("\n").map((l) => (l.trim() ? `# ${l.trimEnd()}` : "#"))
}

/** Text -> rows. */
export function toRows(text: string): EnvRow[] {
  const rows: EnvRow[] = []
  let id = 0
  let blank = 0
  let pending: string[] = []
  const flush = (extra: string[] = []) => {
    const lines = [...pending, ...extra]
    pending = []
    if (lines.length === 0) return
    const joined = lines.join("\n")
    rows.push({
      kind: "block",
      id: id++,
      text: joined,
      source: joined,
      blankBefore: blank,
    })
    blank = 0
  }
  const body = text.startsWith(BOM) ? text.slice(1) : text
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) {
      flush()
      blank++
      continue
    }
    if (line.startsWith("#")) {
      pending.push(raw)
      continue
    }
    const eq = line.indexOf("=")
    if (eq <= 0) {
      flush([raw])
      continue
    }
    rows.push({
      kind: "var",
      id: id++,
      key: line.slice(0, eq).trim(),
      value: line.slice(eq + 1),
      note: noteOf(pending),
      noteSource: pending,
      blankBefore: blank,
    })
    pending = []
    blank = 0
  }
  flush()
  return rows
}

/** Rows -> text. Variables without a name are left out (a row still being typed). */
export function toText(rows: EnvRow[]): string {
  const out: string[] = []
  let carry = 0
  for (const row of rows) {
    if (
      (row.kind === "var" && !row.key.trim()) ||
      (row.kind === "block" && blockLines(row).length === 0)
    ) {
      // Keep the grouping of the rows around a skipped one.
      carry = Math.max(carry, row.blankBefore)
      continue
    }
    let blanks = Math.max(row.blankBefore, carry)
    carry = 0
    // A standalone comment directly above a variable would become its
    // note, and directly above another block it would merge with it (a
    // moved section header, for example): keep it apart with a blank line.
    if (
      blanks === 0 &&
      out.length > 0 &&
      out[out.length - 1].trim().startsWith("#")
    ) {
      blanks = 1
    }
    if (out.length > 0 || row.blankBefore > 0) {
      for (let i = 0; i < blanks; i++) out.push("")
    }
    if (row.kind === "block") {
      out.push(...blockLines(row))
      continue
    }
    const unchanged =
      row.noteSource.length > 0 && noteOf(row.noteSource) === row.note.trimEnd()
    out.push(...(unchanged ? row.noteSource : noteLines(row.note)))
    out.push(`${row.key.trim()}=${row.value}`)
  }
  return out.join("\n")
}

/**
 * Lines of a block row: verbatim while untouched; after an edit every line
 * becomes a comment (a typed line without `#` gets one, so it cannot turn
 * into a variable) and blank lines are dropped (they would split the block).
 */
function blockLines(row: BlockRow): string[] {
  if (row.text === row.source) return row.source.split("\n")
  return row.text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => (l.trim().startsWith("#") ? l.trimEnd() : `# ${l.trim()}`))
}

/** Names of the variables in the rows (for secret flags). */
export function varKeys(rows: EnvRow[]): string[] {
  return rows.flatMap((r) =>
    r.kind === "var" && r.key.trim() ? [r.key.trim()] : []
  )
}

/**
 * Moves the row at index `from` to index `to` (the index it has afterwards,
 * as in dnd-kit's `arrayMove`). A variable's note is part of its row, so it
 * moves with it; a comment block (a section header) moves as one row.
 *
 * Blank lines are the gaps between groups of rows and stay where they are:
 * - the gap the row leaves is closed, and the row that followed it takes
 *   over the larger of the two gaps, so a group head hands its gap on and two
 *   groups never merge (at the top, the leading blank lines are kept);
 * - moved down, the row joins the group of the row it was dropped after
 *   (no blank line before it);
 * - moved up, it joins the group of the row it was dropped before: it takes
 *   that row's gap and that row follows it directly.
 *
 * `toText` then keeps notes attached: a comment directly above a moved
 * variable gets a blank line so it does not become its note, and one directly
 * above another block gets one so the two stay apart.
 */
export function moveRow(rows: EnvRow[], from: number, to: number): EnvRow[] {
  const last = rows.length - 1
  if (from === to || from < 0 || to < 0 || from > last || to > last) {
    return rows
  }
  const list = rows.slice()
  const [moved] = list.splice(from, 1)
  if (from < list.length) {
    const next = list[from]
    list[from] = {
      ...next,
      blankBefore:
        from === 0
          ? moved.blankBefore
          : Math.max(next.blankBefore, moved.blankBefore),
    }
  }
  if (to > from) {
    list.splice(to, 0, { ...moved, blankBefore: 0 })
  } else {
    const target = list[to]
    list.splice(to, 0, { ...moved, blankBefore: target.blankBefore })
    list[to + 1] = { ...target, blankBefore: 0 }
  }
  return list
}

/**
 * True when two env texts hold the same content as the editor writes it:
 * both go through the row model, so what Rows view cannot tell apart
 * (trailing blank lines, spaces around a name) is not a change, while a
 * changed value, note, comment or order is. Used for the unsaved-changes guard.
 */
export function sameEnvText(a: string, b: string): boolean {
  const norm = (text: string) => toText(toRows(text)).replace(/\s+$/, "")
  return norm(a) === norm(b)
}
