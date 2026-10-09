#!/usr/bin/env node
// Checks the message files (`messages/<locale>/<namespace>.json`):
//  - every locale has the same set of files as English, and every file is a namespace
//    listed in src/i18n/namespaces.ts (and every listed namespace has a file);
//  - each file has exactly the keys of its English counterpart (a key is the dotted path
//    of a string leaf, e.g. `groups.platform`);
//  - no value is empty or non-string, and none uses a self-closing rich-text tag (`<b/>`);
//  - ICU placeholders (`{count}`) match between languages, since a missing one breaks the sentence.
// An empty `{}` file is fine: it is a namespace nobody has filled yet.
// Run with `npm run check:i18n`.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const DIR = path.join(ROOT, "messages")
const BASE = "en"
const problems = []

// Namespaces declared in src/i18n/namespaces.ts (quoted names inside the NAMESPACES array).
const source = fs.readFileSync(path.join(ROOT, "src", "i18n", "namespaces.ts"), "utf8")
const listMatch = /NAMESPACES\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(source)
if (!listMatch) {
  console.error("Could not find the NAMESPACES array in src/i18n/namespaces.ts")
  process.exit(1)
}
const declared = new Set([...listMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]))

function leaves(node, prefix = "", out = new Map()) {
  for (const [k, v] of Object.entries(node)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === "object") leaves(v, key, out)
    else out.set(key, v)
  }
  return out
}

const placeholders = (s) =>
  [...String(s).matchAll(/\{\s*([A-Za-z0-9_]+)\s*(?=[,}])/g)].map((m) => m[1]).sort().join(",")

const locales = fs
  .readdirSync(DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
if (!locales.includes(BASE)) {
  console.error(`messages/${BASE} is missing`)
  process.exit(1)
}

const load = (locale, ns) =>
  leaves(JSON.parse(fs.readFileSync(path.join(DIR, locale, `${ns}.json`), "utf8")))
const filesOf = (locale) =>
  fs
    .readdirSync(path.join(DIR, locale))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))

for (const locale of locales) {
  const files = new Set(filesOf(locale))
  for (const ns of files)
    if (!declared.has(ns)) problems.push(`${locale}: ${ns}.json is not listed in src/i18n/namespaces.ts`)
  for (const ns of declared)
    if (!files.has(ns)) problems.push(`${locale}: missing file ${ns}.json (listed in namespaces.ts)`)
  for (const f of fs.readdirSync(path.join(DIR, locale)))
    if (!f.endsWith(".json")) problems.push(`${locale}: unexpected file ${f}`)

  for (const ns of files) {
    if (!declared.has(ns)) continue
    let msgs
    try {
      msgs = load(locale, ns)
    } catch (e) {
      problems.push(`${locale}/${ns}.json: ${e.message}`)
      continue
    }
    for (const [key, value] of msgs)
      if (typeof value !== "string" || value.trim() === "")
        problems.push(`${locale}/${ns}.json: empty or non-string value at ${key}`)
    // next-intl does not render self-closing rich-text tags (`<b/>`): they would show up raw.
    for (const [key, value] of msgs)
      if (typeof value === "string" && /<[A-Za-z][A-Za-z0-9-]*\s*\/>/.test(value))
        problems.push(`${locale}/${ns}.json: self-closing rich-text tag at ${key} (use <x></x>)`)
    if (locale === BASE) continue
    if (!fs.existsSync(path.join(DIR, BASE, `${ns}.json`))) continue
    const base = load(BASE, ns)
    for (const key of base.keys())
      if (!msgs.has(key)) problems.push(`${locale}/${ns}.json: missing key ${key}`)
    for (const key of msgs.keys())
      if (!base.has(key)) problems.push(`${locale}/${ns}.json: extra key ${key} (not in ${BASE})`)
    for (const [key, value] of msgs) {
      const original = base.get(key)
      if (original !== undefined && placeholders(original) !== placeholders(value))
        problems.push(`${locale}/${ns}.json: placeholders differ from ${BASE} at ${key}`)
    }
  }
}

if (problems.length) {
  console.error(problems.join("\n"))
  console.error(`\n${problems.length} problem(s)`)
  process.exit(1)
}
let keys = 0
for (const ns of declared) keys += load(BASE, ns).size
console.log(`${locales.length} language(s), ${declared.size} namespace(s), ${keys} key(s): in sync`)
