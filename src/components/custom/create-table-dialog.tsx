"use client"

import { Plus, Trash2 } from "lucide-react"
import { useMemo, useState, useTransition } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  buildCreateTable,
  COLUMN_TYPES,
  emptyColumn,
  type ColumnDraft,
} from "@/features/managed-database/create-table"
import { runQueryAction } from "@/features/managed-database/data-browser.actions"
import type { DatabaseEngine } from "@/features/managed-database/managed-database.entity"

/**
 * Columns: Kolom, Tipe, Panjang, Null, PK, Default, hapus. On a phone each column is a small card (labels above each
 * field); from `sm` up it is the table below. Template for the column header and every column row
 * so they line up; all cells are the default field height (h-7). Tipe is the widest so
 * "bigserial (auto increment)" fits.
 */
const COLUMNS_GRID =
  "sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)_4.5rem_2.5rem_2.5rem_minmax(0,1.1fr)_1.75rem]"

/**
 * Form → `CREATE TABLE`, executed through the same query endpoint as the SQL
 * box (so the API's owner/admin check applies). The generated statement is
 * shown so nothing happens that the user has not read.
 */
export function CreateTableDialog({
  databaseId,
  engine,
  db,
  onCreated,
}: {
  databaseId: string
  engine: Exclude<DatabaseEngine, "redis" | "valkey" | "mongodb">
  /** Selected database on the server (undefined = primary). */
  db?: string
  onCreated: (table: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [table, setTable] = useState("")
  const [columns, setColumns] = useState<ColumnDraft[]>(() => [
    {
      ...emptyColumn(engine),
      name: "id",
      type: COLUMN_TYPES[engine][0].value,
      nullable: false,
      primaryKey: true,
    },
    emptyColumn(engine),
  ])
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const types = COLUMN_TYPES[engine]

  const preview = useMemo(() => {
    try {
      return { sql: buildCreateTable(engine, table, columns), error: null }
    } catch (e) {
      return { sql: "", error: e instanceof Error ? e.message : String(e) }
    }
  }, [engine, table, columns])

  const update = (i: number, patch: Partial<ColumnDraft>) =>
    setColumns((cols) => cols.map((c, j) => (j === i ? { ...c, ...patch } : c)))

  const submit = () =>
    start(async () => {
      if (!preview.sql) return setError(preview.error)
      setError(null)
      const r = await runQueryAction(databaseId, preview.sql, db)
      if (!r.ok) return setError(r.error)
      setOpen(false)
      onCreated(table.trim())
      setTable("")
      setColumns([
        {
          ...emptyColumn(engine),
          name: "id",
          type: types[0].value,
          nullable: false,
          primaryKey: true,
        },
        emptyColumn(engine),
      ])
    })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Buat tabel">
          <Plus />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Buat tabel</DialogTitle>
          <DialogDescription>
            Kolom dasar saja; index, foreign key, dan tipe khusus bisa
            ditambahkan lewat kotak SQL setelah tabel ada.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="ct-name">Nama tabel</Label>
            <Input
              id="ct-name"
              value={table}
              onChange={(e) => setTable(e.target.value)}
              placeholder="users"
              className="font-mono"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            {/* Header and every row share COLUMNS_GRID, so each column lines up.
                Below `sm` the header disappears and each column becomes a small
                card with a label above every field. */}
            <div
              className={`hidden items-center gap-2 text-xs text-muted-foreground sm:grid ${COLUMNS_GRID}`}
            >
              <span>Kolom</span>
              <span>Tipe</span>
              <span>Panjang</span>
              <span className="text-center">Null</span>
              <span className="text-center">PK</span>
              <span>Default</span>
              <span />
            </div>
            {columns.map((c, i) => {
              const opt = types.find((o) => o.value === c.type)
              return (
                <div
                  key={i}
                  className={`grid grid-cols-3 items-center gap-2 rounded-md border p-2 sm:rounded-none sm:border-0 sm:p-0 ${COLUMNS_GRID}`}
                >
                  <div className="col-span-3 min-w-0 space-y-1 sm:col-span-1 sm:space-y-0">
                    <span className="text-xs text-muted-foreground sm:hidden">
                      Kolom
                    </span>
                    <Input
                      value={c.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      placeholder="nama"
                      className="font-mono text-xs"
                      aria-label={`Nama kolom ${i + 1}`}
                    />
                  </div>
                  <div className="col-span-3 min-w-0 space-y-1 sm:col-span-1 sm:space-y-0">
                    <span className="text-xs text-muted-foreground sm:hidden">
                      Tipe
                    </span>
                    <Select
                      value={c.type}
                      onValueChange={(v) => update(i, { type: v })}
                    >
                      <SelectTrigger
                        className="w-full min-w-0 font-mono text-xs"
                        aria-label={`Tipe kolom ${i + 1}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {types.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0 space-y-1 sm:space-y-0">
                    <span className="text-xs text-muted-foreground sm:hidden">
                      Panjang
                    </span>
                    <Input
                      value={c.length}
                      onChange={(e) => update(i, { length: e.target.value })}
                      disabled={!opt?.hasLength}
                      className="font-mono text-xs"
                      aria-label={`Panjang kolom ${i + 1}`}
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-0">
                    <span className="text-xs text-muted-foreground sm:hidden">
                      Null
                    </span>
                    <div className="flex h-7 items-center sm:justify-center">
                      <Switch
                        checked={c.nullable && !c.primaryKey}
                        disabled={c.primaryKey}
                        onCheckedChange={(v) => update(i, { nullable: v })}
                        aria-label={`Kolom ${i + 1} boleh NULL`}
                      />
                    </div>
                  </div>
                  <div className="space-y-1 sm:space-y-0">
                    <span className="text-xs text-muted-foreground sm:hidden">
                      PK
                    </span>
                    <div className="flex h-7 items-center sm:justify-center">
                      <Switch
                        checked={c.primaryKey}
                        onCheckedChange={(v) => update(i, { primaryKey: v })}
                        aria-label={`Kolom ${i + 1} primary key`}
                      />
                    </div>
                  </div>
                  <div className="col-span-3 min-w-0 space-y-1 sm:col-span-1 sm:space-y-0">
                    <span className="text-xs text-muted-foreground sm:hidden">
                      Default
                    </span>
                    <Input
                      value={c.defaultValue}
                      onChange={(e) =>
                        update(i, { defaultValue: e.target.value })
                      }
                      placeholder="mis. 0, 'x', now()"
                      className="font-mono text-xs"
                      aria-label={`Default kolom ${i + 1}`}
                    />
                  </div>
                  <div className="col-span-3 flex justify-end sm:col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Hapus kolom ${i + 1}`}
                      disabled={columns.length === 1}
                      onClick={() =>
                        setColumns((cols) => cols.filter((_, j) => j !== i))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setColumns((cols) => [...cols, emptyColumn(engine)])
              }
            >
              <Plus data-icon="inline-start" />
              Tambah kolom
            </Button>
          </div>

          <div className="space-y-1">
            <Label>SQL yang akan dijalankan</Label>
            <pre className="max-h-40 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap">
              {preview.sql || (
                <span className="text-muted-foreground">{preview.error}</span>
              )}
            </pre>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button disabled={pending || !preview.sql} onClick={submit}>
            {pending ? "Membuat…" : "Buat tabel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
