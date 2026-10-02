#!/usr/bin/env node
// Flags the patterns that made a field and a button on one row differ in height:
//   1. a height override on a field (`<Input className="h-8">`, `SelectTrigger`, `Textarea`):
//      fields use the default h-7 (28 px) of the `ui` components;
//   2. a flex/grid row whose controls do not have one height, e.g. `<Input>` (28) next to
//      `<Button size="sm">` (24) — or an input with an `h-8` override next to a default button.
//
// `Button size="sm"`/`xs`/`icon-sm` is fine in toolbars, list/table rows and card headers that hold
// no default-size field, and a row made only of small controls (small select + small icon button)
// is uniform, so it is not reported. When a flagged line is deliberate, put
// `ui-check-ignore: <reason>` in a comment on the line above (or the same line).
//
//   npm run check:ui          (manual: a heuristic, so it is not part of build/CI)
//
// Reads the TSX with the `typescript` package that is already installed; no extra dependency.
// The authoritative check is still measuring in the browser (`getBoundingClientRect`).
import { createRequire } from "node:module"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const ts = require("typescript")

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SRC = path.join(ROOT, "src")
const SKIP_DIRS = new Set([path.join(SRC, "components", "ui")])

const FIELD_TAGS = new Set(["Input", "SelectTrigger"])
const CONTROL_TAGS = new Set([...FIELD_TAGS, "Button"])
const HEIGHT_CLASS = /(^|[\s"'`:])h-(\d+(?:\.\d+)?|\[[^\]]+\]|px)(?=[\s"'`]|$)/
// Heights (px) of the `ui` components' sizes, from src/components/ui.
const BUTTON_H = { default: 28, xs: 20, sm: 24, lg: 32, icon: 28, "icon-xs": 20, "icon-sm": 24, "icon-lg": 32 }
const FLEX_ROW = /(^|[\s"'`:])(flex|inline-flex|grid)(?=[\s"'`]|$)/
const FLEX_COL = /(^|[\s"'`:])flex-col(?=[\s"'`]|$)/

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(p)) walk(p, out)
    } else if (e.name.endsWith(".tsx")) out.push(p)
  }
  return out
}

const isJsx = (n) => ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)
const openingOf = (n) => (ts.isJsxElement(n) ? n.openingElement : n)
const tagOf = (n) => openingOf(n).tagName.getText()
function attrText(n, name) {
  const a = openingOf(n).attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText() === name)
  return a?.initializer?.getText() ?? null
}
const classOf = (n) => attrText(n, "className") ?? ""
const isRow = (n) => isJsx(n) && ts.isJsxElement(n) && FLEX_ROW.test(classOf(n)) && !FLEX_COL.test(classOf(n))

/** Effective height in px of a control, or null when it cannot be told statically. */
function heightOf(n) {
  const cls = classOf(n)
  const m = cls.match(HEIGHT_CLASS)
  if (m) {
    const v = m[2]
    return /^\d/.test(v) ? Number(v) * 4 : null
  }
  const size = attrText(n, "size")
  if (size && !/^"[\w-]+"$/.test(size)) return null // dynamic size
  const name = size ? size.replace(/"/g, "") : "default"
  if (tagOf(n) === "Button") return BUTTON_H[name] ?? null
  return name === "sm" ? 24 : 28 // Input / SelectTrigger
}

/** Controls whose closest flex/grid row is `row` (not those of a nested row). */
function controlsOf(row) {
  const out = []
  const visit = (n) => {
    if (n !== row && isRow(n)) return
    if (isJsx(n) && CONTROL_TAGS.has(tagOf(n))) out.push(n)
    ts.forEachChild(n, visit)
  }
  visit(row)
  return out
}

const findings = []
for (const file of walk(SRC)) {
  const text = fs.readFileSync(file, "utf8")
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const lines = text.split(/\r?\n/)
  const rel = path.relative(ROOT, file).replace(/\\/g, "/")
  const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1
  const ignored = (n) => /ui-check-ignore/.test(lines[line(n) - 2] ?? "") || /ui-check-ignore/.test(lines[line(n) - 1] ?? "")

  const visit = (n) => {
    if (isJsx(n)) {
      const tag = tagOf(n)
      if (FIELD_TAGS.has(tag) && HEIGHT_CLASS.test(classOf(n)) && !ignored(n))
        findings.push({ rel, line: line(n), msg: `<${tag}> overrides its height (${classOf(n).match(HEIGHT_CLASS)[0].replace(/["'`]/g, "").trim()}); fields use the default h-7` })
      if (isRow(n)) {
        const controls = controlsOf(n)
        const hasField = controls.some((c) => FIELD_TAGS.has(tagOf(c)))
        const heights = controls.map((c) => [c, heightOf(c)]).filter(([, h]) => h !== null)
        const distinct = new Set(heights.map(([, h]) => h))
        if (hasField && distinct.size > 1 && !controls.some(ignored))
          findings.push({
            rel,
            line: line(n),
            msg: "row mixes control heights: " + heights.map(([c, h]) => `<${tagOf(c)}${attrText(c, "size") ? ` size=${attrText(c, "size")}` : ""}> ${h}px (line ${line(c)})`).join(", "),
          })
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
}

findings.sort((a, b) => a.rel.localeCompare(b.rel) || a.line - b.line)
for (const f of findings) console.log(`${f.rel}:${f.line}  ${f.msg}`)
console.log(`\n${findings.length} finding(s)`)
process.exitCode = findings.length ? 1 : 0
