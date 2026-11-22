// Checks the pure row model of the env editor (`env-rows.ts`). Node runs the
// TypeScript file directly (type stripping, Node 23.6+): `npm test`.
import assert from "node:assert/strict"
import { test } from "node:test"
import { moveRow, noteOf, toRows, toText } from "./env-rows.ts"

const FIXTURE = [
  "# --- Database ---",
  "",
  "# Primary connection",
  "# (read/write)",
  "DB_URL=postgres://x",
  "DB_POOL=5",
  "",
  "# --- Mail ---",
  "",
  "SMTP_HOST=mail",
  "# sender address",
  "SMTP_FROM=a@b.c",
  "",
  "PLAIN=1",
].join("\n")

/** What a row means, without ids, sources and blank counts. */
const shape = (rows) =>
  rows.map((r) =>
    r.kind === "var" ? `var:${r.key}=${r.value}|${r.note}` : `block:${r.text}`
  )

/** Notes exactly as the API reads them (`extractNotes`): `#` lines directly above. */
const apiNotes = (text) => {
  const notes = {}
  let pending = []
  for (const raw of text.split("\n")) {
    const line = raw.trim()
    if (!line) {
      pending = []
      continue
    }
    if (line.startsWith("#")) {
      pending.push(raw)
      continue
    }
    const eq = line.indexOf("=")
    if (eq > 0) {
      const note = noteOf(pending)
      if (note) notes[line.slice(0, eq).trim()] = note
    }
    pending = []
  }
  return notes
}

const keys = (text) =>
  text
    .split("\n")
    .filter((l) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(l))
    .map((l) => l.slice(0, l.indexOf("=")))

test("text -> rows -> text is unchanged", () => {
  assert.equal(toText(toRows(FIXTURE)), FIXTURE)
})

test("every move survives a save and reload with notes and headers intact", () => {
  const rows = toRows(FIXTURE)
  for (let from = 0; from < rows.length; from++) {
    for (let to = 0; to < rows.length; to++) {
      const moved = moveRow(rows, from, to)
      const text = toText(moved)
      const reread = toRows(text)
      const where = `move ${from} -> ${to}:\n${text}`
      assert.deepEqual(shape(reread), shape(moved), where)
      // The API reads the same notes as the editor shows.
      const expected = {}
      for (const r of moved)
        if (r.kind === "var" && r.note) expected[r.key] = r.note
      assert.deepEqual(apiNotes(text), expected, where)
      assert.ok(!text.startsWith("\n"), `leading blank line, ${where}`)
      assert.ok(!/\n\n\n/.test(text), `double blank line, ${where}`)
    }
  }
})

test("moving changes the stored order of the text", () => {
  const rows = toRows("A=1\nB=2\nC=3")
  assert.equal(toText(moveRow(rows, 0, 2)), "B=2\nC=3\nA=1")
  assert.equal(toText(moveRow(rows, 2, 0)), "C=3\nA=1\nB=2")
  assert.equal(toText(moveRow(rows, 1, 1)), "A=1\nB=2\nC=3")
  assert.equal(moveRow(rows, 0, 5), rows)
})

test("a note travels with its variable", () => {
  const rows = toRows("# first\nA=1\n# second\nB=2")
  assert.equal(toText(moveRow(rows, 1, 0)), "# second\nB=2\n# first\nA=1")
})

test("a group head hands its blank line on, so groups do not merge", () => {
  const rows = toRows("A=1\nB=2\n\nC=3\nD=4")
  // C (head of the second group) moved to the top joins the first group.
  assert.equal(toText(moveRow(rows, 2, 0)), "C=3\nA=1\nB=2\n\nD=4")
  // A moved to the end: B starts the text, the blank line stays before C.
  assert.equal(toText(moveRow(rows, 0, 3)), "B=2\n\nC=3\nD=4\nA=1")
  // Moved down it joins the group of the row it was dropped after.
  assert.equal(toText(moveRow(rows, 0, 2)), "B=2\n\nC=3\nA=1\nD=4")
  // Moved up it joins the group of the row it was dropped before.
  assert.equal(toText(moveRow(rows, 3, 1)), "A=1\nD=4\nB=2\n\nC=3")
})

test("a section header does not become a note when moved above a variable", () => {
  const rows = toRows("A=1\nB=2\n\n# --- Section ---")
  const text = toText(moveRow(rows, 2, 1))
  // It joins the group of B (B's gap goes to it); B gets a blank line so the
  // header stays a header.
  assert.equal(text, "A=1\n# --- Section ---\n\nB=2")
  assert.deepEqual(apiNotes(text), {})
  assert.deepEqual(shape(toRows(text)), shape(moveRow(rows, 2, 1)))
})

test("two comment blocks moved next to each other stay two blocks", () => {
  const rows = toRows("# one\n\nA=1\n\n# two")
  const moved = moveRow(rows, 2, 1)
  assert.equal(toText(moved), "# one\n\n# two\n\nA=1")
  assert.equal(toRows(toText(moved)).length, 3)
})

test("leading blank lines stay at the top only", () => {
  const rows = toRows("\nA=1\nB=2")
  assert.equal(toText(moveRow(rows, 0, 1)), "\nB=2\nA=1")
  assert.equal(toText(moveRow(rows, 1, 0)), "\nB=2\nA=1")
})

test("keys come out in the new order", () => {
  const rows = toRows(FIXTURE)
  const moved = moveRow(rows, rows.length - 1, 0)
  assert.deepEqual(keys(toText(moved)), [
    "PLAIN",
    "DB_URL",
    "DB_POOL",
    "SMTP_HOST",
    "SMTP_FROM",
  ])
})
