"use client"

import { Eye, EyeOff, Plus, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { SECRET_NAME } from "@/features/project/project-environment.entity"

interface Row {
  id: number
  key: string
  value: string
}

/** `KEY=VALUE` text -> rows; comments and malformed lines are kept only in text mode. */
function toRows(text: string): Row[] {
  const rows: Row[] = []
  let id = 0
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq <= 0) continue
    rows.push({
      id: id++,
      key: line.slice(0, eq).trim(),
      value: line.slice(eq + 1),
    })
  }
  return rows
}

/**
 * Secret flags for the project environment editor. `initial*` are the flags
 * the API reported when the values were revealed; the editor submits only the
 * ones the user changed (JSON `{NAME: boolean}` in the hidden field `name`).
 */
export interface SecretFlagsConfig {
  /** Name of the hidden field that carries the JSON of the changed flags. */
  name: string
  secretKeys: string[]
  plainKeys: string[]
}

function toText(rows: Row[]): string {
  return rows
    .filter((r) => r.key.trim())
    .map((r) => `${r.key.trim()}=${r.value}`)
    .join("\n")
}

/**
 * Per-line env editor with masked values. Submits as one `KEY=VALUE` text
 * field (`name`) so the API contract stays a plain text blob. Text mode
 * exposes the raw blob for pasting a whole .env (and preserves comments).
 */
export function EnvEditor({
  name,
  defaultValue,
  placeholder,
  readOnly = false,
  secrets,
}: {
  name: string
  defaultValue: string
  placeholder?: string
  /** Shows a Secret switch per variable (project environments only). */
  secrets?: SecretFlagsConfig
  /** Viewers: values stay masked/revealable, nothing can be edited, added or removed. */
  readOnly?: boolean
}) {
  const t = useTranslations("common.envEditor")
  const [text, setText] = useState(defaultValue)
  const [rows, setRows] = useState<Row[]>(() => toRows(defaultValue))
  const [mode, setMode] = useState<"rows" | "text">("rows")
  const [revealed, setRevealed] = useState(false)
  const baseId = useId()
  // Secret flags: what the user changed (name -> flag). A variable that was
  // not in the revealed text starts as secret when its name looks like one,
  // which is also what the API does when no flag is sent.
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [initial] = useState(() => ({
    keys: new Set(toRows(defaultValue).map((r) => r.key)),
    secret: new Set(secrets?.secretKeys ?? []),
    plain: new Set(secrets?.plainKeys ?? []),
  }))
  const defaultSecret = (key: string) =>
    initial.secret.has(key)
      ? true
      : initial.plain.has(key) || initial.keys.has(key)
        ? false
        : SECRET_NAME.test(key)
  const isSecret = (key: string) => touched[key] ?? defaultSecret(key)
  const toggleSecret = (key: string) => {
    const next = !isSecret(key)
    setTouched((prev) => {
      const copy = { ...prev }
      if (next === defaultSecret(key)) delete copy[key]
      else copy[key] = next
      return copy
    })
  }
  // Only flags of variables that are in the final text are submitted.
  const flagsJson = (() => {
    if (!secrets) return ""
    const present = new Set(toRows(text).map((r) => r.key))
    const out: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(touched)) if (present.has(k)) out[k] = v
    return JSON.stringify(out)
  })()

  const updateRows = (next: Row[]) => {
    setRows(next)
    setText(toText(next))
  }
  const switchMode = (next: "rows" | "text") => {
    if (next === "rows") setRows(toRows(text))
    setMode(next)
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={text} />
      {secrets && <input type="hidden" name={secrets.name} value={flagsJson} />}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 text-xs">
          <Button
            type="button"
            size="sm"
            variant={mode === "rows" ? "secondary" : "ghost"}
            onClick={() => switchMode("rows")}
          >
            {t("rows")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "text" ? "secondary" : "ghost"}
            onClick={() => switchMode("text")}
          >
            {t("text")}
          </Button>
        </div>
        {mode === "rows" && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setRevealed((r) => !r)}
            aria-pressed={revealed}
          >
            {revealed ? <EyeOff /> : <Eye />}
            {revealed ? t("hideValues") : t("showValues")}
          </Button>
        )}
      </div>

      {mode === "text" ? (
        <Textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder ?? "KEY=value\nANOTHER=value"}
          className="font-mono text-xs"
          aria-label={t("textAria")}
        />
      ) : (
        <div className="space-y-1.5">
          {rows.map((row, i) => (
            <div
              key={row.id}
              className={
                secrets
                  ? "flex flex-wrap items-center gap-1.5 sm:flex-nowrap"
                  : "flex items-center gap-1.5"
              }
            >
              <Input
                aria-label={t("keyAria", { n: i + 1 })}
                id={`${baseId}-k-${row.id}`}
                value={row.key}
                onChange={(e) =>
                  updateRows(
                    rows.map((r) =>
                      r.id === row.id ? { ...r, key: e.target.value } : r
                    )
                  )
                }
                placeholder="KEY"
                readOnly={readOnly}
                className={
                  secrets
                    ? "w-full font-mono text-xs sm:w-2/5 sm:max-w-sm"
                    : "w-2/5 max-w-sm font-mono text-xs"
                }
                autoComplete="off"
                spellCheck={false}
              />
              <Input
                aria-label={t("valueAria", { n: i + 1 })}
                id={`${baseId}-v-${row.id}`}
                type={revealed ? "text" : "password"}
                value={row.value}
                onChange={(e) =>
                  updateRows(
                    rows.map((r) =>
                      r.id === row.id ? { ...r, value: e.target.value } : r
                    )
                  )
                }
                placeholder="value"
                readOnly={readOnly}
                className={
                  secrets
                    ? "min-w-0 flex-1 basis-40 font-mono text-xs"
                    : "flex-1 font-mono text-xs"
                }
                autoComplete="off"
                spellCheck={false}
              />
              {secrets && row.key.trim() && (
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <Switch
                    size="sm"
                    checked={isSecret(row.key.trim())}
                    onCheckedChange={() => toggleSecret(row.key.trim())}
                    disabled={readOnly}
                    aria-label={t("secretAria", { name: row.key.trim() })}
                  />
                  {t("secret")}
                </label>
              )}
              {!readOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("removeAria", {
                    name: row.key || t("rowFallback", { n: i + 1 }),
                  })}
                  onClick={() =>
                    updateRows(rows.filter((r) => r.id !== row.id))
                  }
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          ))}
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              className="mt-0.5 h-9 w-full border-dashed bg-transparent text-muted-foreground hover:text-foreground"
              onClick={() =>
                updateRows([
                  ...rows,
                  { id: (rows.at(-1)?.id ?? -1) + 1, key: "", value: "" },
                ])
              }
            >
              <Plus data-icon="inline-start" />
              {t("addVariable")}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
