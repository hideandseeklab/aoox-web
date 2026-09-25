"use client"

import { Pencil } from "lucide-react"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { updateRowAction } from "@/features/managed-database/data-browser.actions"
import type { ColumnInfo } from "@/features/managed-database/data-browser.entity"

interface FieldState {
  value: string
  isNull: boolean
}

/**
 * Edits one row through the primary key alone — the same guarantee the API
 * enforces server-side (assertRowTarget): `where` is always every primary
 * key column read from the row as it was fetched, never edited here.
 */
export function RowEditDialog({
  databaseId,
  table,
  schema,
  db,
  columns,
  row,
  onSaved,
}: {
  databaseId: string
  table: string
  schema: string | null
  /** Selected database on the server (undefined = primary). */
  db?: string
  columns: ColumnInfo[]
  /** Current values, keyed by column name (from the row's own display columns). */
  row: Record<string, string | null>
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  const [fields, setFields] = useState<Record<string, FieldState>>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const editable = columns.filter((c) => !c.isPrimaryKey)
  const pk = columns.filter((c) => c.isPrimaryKey)

  const openDialog = () => {
    setError(null)
    setFields(
      Object.fromEntries(
        columns.map((c) => {
          const v = row[c.name] ?? null
          return [c.name, { value: v ?? "", isNull: v === null }]
        })
      )
    )
    setOpen(true)
  }

  const save = () =>
    start(async () => {
      setError(null)
      // `row` comes from zipping the grid's displayed columns by name; if a
      // primary key column isn't in there at all (should not happen, but a
      // silent value mismatch here is exactly what assertRowTarget on the
      // server exists to catch), refuse rather than build a `where` with an
      // undefined value.
      const missingPk = pk.find((c) => !(c.name in row))
      if (missingPk) {
        return setError(
          `Nilai kolom "${missingPk.name}" tidak ditemukan di baris ini`
        )
      }
      const where = Object.fromEntries(pk.map((c) => [c.name, row[c.name]]))
      const set = Object.fromEntries(
        editable
          .filter((c) => c.name in row)
          .map((c) => {
            const f = fields[c.name]
            return [c.name, f?.isNull ? null : (f?.value ?? "")]
          })
      )
      const r = await updateRowAction(databaseId, table, where, set, {
        db,
        schema,
      })
      if (!r.ok) return setError(r.error)
      setOpen(false)
      onSaved()
    })

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) openDialog()
        else setOpen(false)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Ubah baris">
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ubah baris</DialogTitle>
          <DialogDescription>
            {table} — dicari lewat primary key (
            {pk.map((c) => c.name).join(", ")}); kolom itu sendiri tidak bisa
            diubah di sini.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          {pk.map((c) => (
            <div key={c.name} className="space-y-1">
              <Label className="font-mono text-xs">{c.name}</Label>
              <Input
                value={row[c.name] ?? ""}
                disabled
                className="font-mono text-xs"
              />
            </div>
          ))}
          {editable.map((c) => {
            const f = fields[c.name] ?? { value: "", isNull: false }
            return (
              <div key={c.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="font-mono text-xs">
                    {c.name}{" "}
                    <span className="text-muted-foreground">{c.dataType}</span>
                  </Label>
                  {c.nullable && (
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Switch
                        checked={f.isNull}
                        onCheckedChange={(v) =>
                          setFields((s) => ({
                            ...s,
                            [c.name]: { ...f, isNull: v },
                          }))
                        }
                      />
                      NULL
                    </label>
                  )}
                </div>
                <Input
                  value={f.value}
                  disabled={f.isNull}
                  onChange={(e) =>
                    setFields((s) => ({
                      ...s,
                      [c.name]: { ...f, value: e.target.value },
                    }))
                  }
                  className="font-mono text-xs"
                />
              </div>
            )
          })}
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
