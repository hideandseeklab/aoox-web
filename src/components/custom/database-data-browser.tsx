"use client"

import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Play,
  Plus,
  RefreshCw,
  Table2,
  Trash2,
  Upload,
} from "lucide-react"
import { QueryHistoryMenu } from "@/components/custom/query-history-menu"
import { RowEditDialog } from "@/components/custom/row-edit-dialog"
import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CreateTableDialog } from "@/components/custom/create-table-dialog"
import {
  createSchemaAction,
  deleteRowAction,
  dropSchemaAction,
  fetchTableRowsAction,
  importSqlAction,
  listColumnsAction,
  listSchemasAction,
  listTablesAction,
  runQueryAction,
} from "@/features/managed-database/data-browser.actions"
import type {
  ColumnInfo,
  QueryResult,
  SchemaInfo,
  TableInfo,
  TableRows,
} from "@/features/managed-database/data-browser.entity"
import type { ManagedDatabase } from "@/features/managed-database/managed-database.entity"

const PAGE = 50

/**
 * phpMyAdmin-lite: table list, paged rows, one query box. Every call spins
 * up a helper container on the API, so nothing is fetched until asked.
 */
export function DatabaseDataBrowser({
  db,
  running,
  canWrite,
}: {
  db: ManagedDatabase
  running: boolean
  canWrite: boolean
}) {
  const isRedis = db.engine === "redis"
  // Which database on the server we are browsing; the primary by default.
  const [schemas, setSchemas] = useState<SchemaInfo[] | null>(null)
  const [schema, setSchema] = useState(db.databaseName)
  const [newSchema, setNewSchema] = useState("")
  const [tables, setTables] = useState<TableInfo[] | null>(null)
  const [selected, setSelected] = useState<TableInfo | null>(null)
  const [rows, setRows] = useState<TableRows | null>(null)
  const [offset, setOffset] = useState(0)
  const [order, setOrder] = useState<{
    by: string
    dir: "asc" | "desc"
  } | null>(null)
  // Column structure of the selected table: drives the "Struktur" tab and
  // whether a row can be edited/deleted (needs a primary key).
  const [columns, setColumns] = useState<ColumnInfo[] | null>(null)
  const [view, setView] = useState<"data" | "structure">("data")
  const [sql, setSql] = useState("")
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const fileInput = useRef<HTMLInputElement>(null)

  const importFile = (file: File) =>
    start(async () => {
      setError(null)
      setNotice(null)
      const fd = new FormData()
      fd.set("file", file)
      const r = await importSqlAction(db.id, dbParam, fd)
      if (!r.ok) return setError(r.error)
      setNotice(r.data.message)
      setTables(null) // the import may have created tables
      setSelected(null)
      setRows(null)
      setResult(null)
    })

  // `undefined` = primary database: keeps the API calls identical to before.
  const dbParam = schema === db.databaseName ? undefined : schema

  const loadTables = useCallback(
    () =>
      start(async () => {
        setError(null)
        const r = await listTablesAction(db.id, dbParam)
        if (r.ok) setTables(r.data)
        else setError(r.error)
      }),
    [db.id, dbParam]
  )

  const loadSchemas = useCallback(
    () =>
      start(async () => {
        const r = await listSchemasAction(db.id)
        if (r.ok) setSchemas(r.data)
      }),
    [db.id]
  )

  const loadRows = useCallback(
    (t: TableInfo, off: number, ord: typeof order) =>
      start(async () => {
        setError(null)
        const r = await fetchTableRowsAction(db.id, t.name, {
          db: dbParam,
          schema: t.schema,
          limit: PAGE,
          offset: off,
          orderBy: ord?.by,
          dir: ord?.dir,
        })
        if (r.ok) setRows(r.data)
        else setError(r.error)
      }),
    [db.id, dbParam]
  )

  const loadColumns = useCallback(
    (t: TableInfo) =>
      start(async () => {
        const r = await listColumnsAction(db.id, t.name, {
          db: dbParam,
          schema: t.schema,
        })
        if (r.ok) setColumns(r.data)
      }),
    [db.id, dbParam]
  )

  useEffect(() => {
    if (running && tables === null) loadTables()
  }, [running, tables, loadTables])

  useEffect(() => {
    if (running && !isRedis && schemas === null) loadSchemas()
  }, [running, isRedis, schemas, loadSchemas])

  const switchSchema = (name: string) => {
    setSchema(name)
    setSelected(null)
    setRows(null)
    setResult(null)
    setTables(null) // the effect above reloads for the new database
  }

  const addSchema = () =>
    start(async () => {
      const name = newSchema.trim()
      if (!name) return
      setError(null)
      const r = await createSchemaAction(db.id, name)
      if (!r.ok) return setError(r.error)
      setNewSchema("")
      setSchemas((s) => [...(s ?? []), r.data])
      switchSchema(r.data.name)
    })

  const removeSchema = (name: string) =>
    start(async () => {
      if (!window.confirm(`Hapus database "${name}" beserta seluruh isinya?`))
        return
      setError(null)
      const r = await dropSchemaAction(db.id, name)
      if (!r.ok) return setError(r.error)
      setSchemas((s) => (s ?? []).filter((x) => x.name !== name))
      if (schema === name) switchSchema(db.databaseName)
    })

  const openTable = (t: TableInfo) => {
    setSelected(t)
    setOffset(0)
    setOrder(null)
    setResult(null)
    setView("data")
    setColumns(null)
    loadRows(t, 0, null)
    if (!isRedis) loadColumns(t)
  }

  const sort = (col: string) => {
    if (!selected || isRedis) return
    const next: NonNullable<typeof order> =
      order?.by === col && order.dir === "asc"
        ? { by: col, dir: "desc" }
        : { by: col, dir: "asc" }
    setOrder(next)
    setOffset(0)
    loadRows(selected, 0, next)
  }

  const page = (delta: number) => {
    if (!selected) return
    const next = Math.max(0, offset + delta)
    setOffset(next)
    loadRows(selected, next, order)
  }

  const run = () =>
    start(async () => {
      if (!sql.trim()) return
      setError(null)
      const r = await runQueryAction(db.id, sql, dbParam)
      if (r.ok) {
        setResult(r.data)
        setSelected(null)
        setRows(null)
        setColumns(null)
      } else setError(r.error)
    })

  /** A row's current values, keyed by column name (from the grid's own columns). */
  const rowRecord = (
    values: (string | null)[]
  ): Record<string, string | null> =>
    Object.fromEntries(
      (rows?.columns ?? []).map((c, i) => [c, values[i] ?? null])
    )

  const removeRow = (values: (string | null)[]) =>
    start(async () => {
      if (!selected || !columns) return
      if (!window.confirm("Hapus baris ini?")) return
      setError(null)
      const record = rowRecord(values)
      // The API requires `where` to be exactly the primary key — sending
      // every column would still work when there's nothing to disagree
      // with, but is not what assertRowTarget checks against.
      const where = Object.fromEntries(
        columns
          .filter((c) => c.isPrimaryKey)
          .map((c) => [c.name, record[c.name]])
      )
      const r = await deleteRowAction(db.id, selected.name, where, {
        db: dbParam,
        schema: selected.schema,
      })
      if (!r.ok) return setError(r.error)
      loadRows(selected, offset, order)
    })

  if (!running) {
    return (
      <p className="text-sm text-muted-foreground">
        Database harus berjalan untuk menjelajahi data.
      </p>
    )
  }

  const grid = result ?? rows

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <Card className="self-start">
        <CardHeader>
          {!isRedis && (
            <div className="mb-2 space-y-2">
              <div className="flex items-center gap-1">
                <Database className="size-3.5 shrink-0 text-muted-foreground" />
                <Select value={schema} onValueChange={switchSchema}>
                  <SelectTrigger
                    size="sm"
                    className="w-full min-w-0 flex-1 font-mono text-xs"
                    aria-label="Database"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      schemas ?? [{ name: db.databaseName, isPrimary: true }]
                    ).map((s) => (
                      <SelectItem key={s.name} value={s.name}>
                        {s.name}
                        {s.isPrimary && (
                          <span className="text-muted-foreground">
                            {" "}
                            · utama
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {canWrite && schema !== db.databaseName && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Hapus database ${schema}`}
                    className="shrink-0"
                    disabled={pending}
                    onClick={() => removeSchema(schema)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
              {canWrite && (
                <form
                  className="flex items-center gap-1"
                  onSubmit={(e) => {
                    e.preventDefault()
                    addSchema()
                  }}
                >
                  <Input
                    value={newSchema}
                    onChange={(e) => setNewSchema(e.target.value)}
                    placeholder="database baru"
                    className="h-7 min-w-0 flex-1 font-mono text-xs"
                    aria-label="Nama database baru"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Buat database"
                    className="shrink-0"
                    disabled={pending || !newSchema.trim()}
                  >
                    <Plus />
                  </Button>
                </form>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <CardTitle>{isRedis ? "Key" : "Tabel"}</CardTitle>
            <div className="flex items-center">
              {canWrite && db.engine !== "redis" && (
                <CreateTableDialog
                  databaseId={db.id}
                  engine={db.engine}
                  db={dbParam}
                  onCreated={(name) => {
                    setTables(null) // reload the list…
                    // …and open the new table right away.
                    const t: TableInfo = {
                      schema: db.engine === "postgres" ? "public" : null,
                      name,
                      estimatedRows: null,
                    }
                    openTable(t)
                  }}
                />
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Muat ulang daftar"
                disabled={pending}
                onClick={loadTables}
              >
                <RefreshCw />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {tables === null ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">Memuat…</p>
          ) : tables.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">
              {isRedis ? "Belum ada key." : "Belum ada tabel."}
            </p>
          ) : (
            <ul className="max-h-[480px] divide-y overflow-y-auto text-sm">
              {tables.map((t) => {
                const key = `${t.schema ?? ""}.${t.name}`
                const active =
                  selected &&
                  selected.name === t.name &&
                  selected.schema === t.schema
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => openTable(t)}
                      className={`flex w-full items-center gap-2 px-4 py-1.5 text-start hover:bg-muted ${active ? "bg-muted font-medium" : ""}`}
                    >
                      <Table2 className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate font-mono text-xs">
                        {t.schema && t.schema !== "public"
                          ? `${t.schema}.${t.name}`
                          : t.name}
                      </span>
                      {t.estimatedRows !== null && (
                        <span className="text-xs text-muted-foreground">
                          ~{t.estimatedRows}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="min-w-0 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{isRedis ? "Perintah Redis" : "SQL"}</CardTitle>
              <div className="flex items-center gap-1">
                <QueryHistoryMenu databaseId={db.id} onPick={setSql} />
                {!isRedis && (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={`/api/databases/${db.id}/export${dbParam ? `?db=${encodeURIComponent(dbParam)}` : ""}`}
                    >
                      <Download data-icon="inline-start" />
                      Ekspor SQL
                    </a>
                  </Button>
                )}
                {!isRedis && canWrite && (
                  <>
                    <input
                      ref={fileInput}
                      type="file"
                      accept=".sql,text/plain,application/sql"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        e.target.value = ""
                        if (
                          f &&
                          window.confirm(
                            `Jalankan ${f.name} (${(f.size / 1024).toFixed(0)} KB) di database "${schema}"? Statement di dalamnya dieksekusi apa adanya.`
                          )
                        )
                          importFile(f)
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => fileInput.current?.click()}
                    >
                      <Upload data-icon="inline-start" />
                      Impor SQL
                    </Button>
                  </>
                )}
              </div>
            </div>
            <CardDescription>
              {isRedis
                ? "Satu perintah, mis. HGETALL user:1 atau SCAN 0 MATCH sess:* COUNT 100."
                : "Satu statement per eksekusi; SELECT tanpa LIMIT dibatasi 500 baris, timeout 15 detik."}{" "}
              {canWrite
                ? "Kamu bisa menulis (INSERT/UPDATE/DELETE/DDL) — hati-hati, tidak ada undo."
                : "Sesi ini read-only; hanya owner/admin yang bisa mengubah data."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault()
                  run()
                }
              }}
              placeholder={
                isRedis ? "KEYS *" : "select * from users order by id desc"
              }
              className="min-h-24 font-mono text-xs"
              spellCheck={false}
            />
            <div className="flex items-center gap-3">
              <Button size="sm" disabled={pending || !sql.trim()} onClick={run}>
                <Play data-icon="inline-start" />
                Jalankan
              </Button>
              <span className="text-xs text-muted-foreground">Ctrl+Enter</span>
              {grid && (
                <span className="ms-auto text-xs text-muted-foreground">
                  {grid.rows.length} baris · {grid.durationMs} ms
                  {grid.truncated && " · dipotong 500"}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {notice && (
          <p className="rounded-md border p-3 text-sm" role="status">
            {notice}
          </p>
        )}
        {error && (
          <pre
            className="overflow-x-auto rounded-md border border-destructive/40 bg-destructive/5 p-3 font-mono text-xs whitespace-pre-wrap text-destructive"
            role="alert"
          >
            {error}
          </pre>
        )}

        {(grid || (selected && !isRedis)) && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="truncate">
                  {result
                    ? "Hasil query"
                    : selected
                      ? `${selected.schema && selected.schema !== "public" ? `${selected.schema}.` : ""}${selected.name}`
                      : ""}
                </CardTitle>
                {grid?.message && (
                  <Badge variant="secondary">{grid.message}</Badge>
                )}
                {rows && !result && !isRedis && (
                  <div className="inline-flex overflow-hidden rounded-md border text-xs">
                    <button
                      type="button"
                      onClick={() => setView("data")}
                      className={`px-2 py-1 ${view === "data" ? "bg-muted font-medium" : "text-muted-foreground"}`}
                    >
                      Data
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("structure")}
                      className={`border-s px-2 py-1 ${view === "structure" ? "bg-muted font-medium" : "text-muted-foreground"}`}
                    >
                      Struktur
                    </button>
                  </div>
                )}
                {rows && !result && !isRedis && (
                  <Button
                    asChild
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Ekspor CSV"
                  >
                    <a
                      href={`/api/databases/${db.id}/tables/${encodeURIComponent(selected?.name ?? "")}/rows/export?${new URLSearchParams(
                        {
                          ...(dbParam ? { db: dbParam } : {}),
                          ...(selected?.schema
                            ? { schema: selected.schema }
                            : {}),
                          ...(order
                            ? { orderBy: order.by, dir: order.dir }
                            : {}),
                        }
                      )}`}
                    >
                      <Download />
                    </a>
                  </Button>
                )}
                {rows && !result && (
                  <span className="ms-auto flex items-center gap-1 text-xs text-muted-foreground">
                    {rows.rows.length === 0
                      ? "kosong"
                      : `${offset + 1}–${offset + rows.rows.length}`}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Sebelumnya"
                      disabled={pending || offset === 0}
                      onClick={() => page(-PAGE)}
                    >
                      <ChevronLeft />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Berikutnya"
                      disabled={pending || !rows.hasMore}
                      onClick={() => page(PAGE)}
                    >
                      <ChevronRight />
                    </Button>
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {view === "structure" && rows && !result && !isRedis ? (
                columns === null ? (
                  <p className="px-4 pb-4 text-sm text-muted-foreground">
                    Memuat…
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kolom</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead>Nullable</TableHead>
                        <TableHead>Default</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {columns.map((c) => (
                        <TableRow key={c.name}>
                          <TableCell className="font-mono">
                            {c.name}
                            {c.isPrimaryKey && (
                              <Badge variant="outline" className="ms-1.5">
                                PK
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">
                            {c.dataType}
                          </TableCell>
                          <TableCell>{c.nullable ? "ya" : "tidak"}</TableCell>
                          <TableCell className="max-w-[220px] truncate font-mono text-muted-foreground">
                            {c.defaultValue ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              ) : !grid || grid.columns.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">
                  Tidak ada hasil.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {grid.columns.map((c, i) => (
                        <TableHead
                          key={`${c}-${i}`}
                          className={
                            rows && !result && !isRedis
                              ? "cursor-pointer select-none"
                              : ""
                          }
                          onClick={() => rows && !result && sort(c)}
                        >
                          <span className="inline-flex items-center gap-1 font-mono">
                            {c}
                            {order?.by === c &&
                              (order.dir === "asc" ? (
                                <ArrowUp className="size-3" />
                              ) : (
                                <ArrowDown className="size-3" />
                              ))}
                          </span>
                        </TableHead>
                      ))}
                      {rows &&
                        !result &&
                        !isRedis &&
                        canWrite &&
                        columns?.some((c) => c.isPrimaryKey) && (
                          <TableHead className="w-0">Aksi</TableHead>
                        )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grid.rows.map((r, ri) => (
                      <TableRow key={ri}>
                        {r.map((v, ci) => (
                          <TableCell
                            key={ci}
                            className="max-w-[320px] truncate font-mono"
                            title={v ?? undefined}
                          >
                            {v === null ? (
                              <span className="text-muted-foreground italic">
                                NULL
                              </span>
                            ) : v === "" ? (
                              <span className="text-muted-foreground italic">
                                (kosong)
                              </span>
                            ) : (
                              v
                            )}
                          </TableCell>
                        ))}
                        {rows &&
                          !result &&
                          !isRedis &&
                          canWrite &&
                          selected &&
                          columns?.some((c) => c.isPrimaryKey) && (
                            <TableCell className="whitespace-nowrap">
                              <RowEditDialog
                                databaseId={db.id}
                                table={selected.name}
                                schema={selected.schema}
                                db={dbParam}
                                columns={columns}
                                row={rowRecord(r)}
                                onSaved={() =>
                                  loadRows(selected, offset, order)
                                }
                              />
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Hapus baris"
                                onClick={() => removeRow(r)}
                              >
                                <Trash2 />
                              </Button>
                            </TableCell>
                          )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
