"use client"

import { Eye, EyeOff, Plus, Trash2 } from "lucide-react"
import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

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
}: {
  name: string
  defaultValue: string
  placeholder?: string
}) {
  const [text, setText] = useState(defaultValue)
  const [rows, setRows] = useState<Row[]>(() => toRows(defaultValue))
  const [mode, setMode] = useState<"rows" | "text">("rows")
  const [revealed, setRevealed] = useState(false)
  const baseId = useId()

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
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 text-xs">
          <Button
            type="button"
            size="sm"
            variant={mode === "rows" ? "secondary" : "ghost"}
            onClick={() => switchMode("rows")}
          >
            Baris
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "text" ? "secondary" : "ghost"}
            onClick={() => switchMode("text")}
          >
            Teks
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
            {revealed ? "Sembunyikan" : "Tampilkan nilai"}
          </Button>
        )}
      </div>

      {mode === "text" ? (
        <Textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder ?? "KEY=value\nANOTHER=value"}
          className="font-mono text-xs"
          aria-label="Environment (teks)"
        />
      ) : (
        <div className="space-y-1.5">
          {rows.map((row, i) => (
            <div key={row.id} className="flex items-center gap-1.5">
              <Input
                aria-label={`Key ${i + 1}`}
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
                className="w-2/5 font-mono text-xs"
                autoComplete="off"
                spellCheck={false}
              />
              <Input
                aria-label={`Value ${i + 1}`}
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
                className="flex-1 font-mono text-xs"
                autoComplete="off"
                spellCheck={false}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Hapus ${row.key || `baris ${i + 1}`}`}
                onClick={() => updateRows(rows.filter((r) => r.id !== row.id))}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              updateRows([
                ...rows,
                { id: (rows.at(-1)?.id ?? -1) + 1, key: "", value: "" },
              ])
            }
          >
            <Plus data-icon="inline-start" />
            Tambah variabel
          </Button>
        </div>
      )}
    </div>
  )
}
