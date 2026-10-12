"use client"

import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Play,
  RefreshCw,
  Table2,
  Trash2,
  Upload,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { QueryHistoryMenu } from "@/components/custom/query-history-menu"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
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
  deleteRowAction,
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
  canQuery = true,
}: {
  db: ManagedDatabase
  running: boolean
  canWrite: boolean
  /** False for project viewers: the API rejects POST /query even for SELECT. */
  canQuery?: boolean
}) {
  const t = useTranslations("database")
  const tc = useTranslations("common")
  // Valkey is a Redis drop-in (same key-value commands), so it shares every
  // Redis-specific UI branch here.
  const isRedis = db.engine === "redis" || db.engine === "valkey"
  const kvLabel = db.engine === "valkey" ? "Valkey" : "Redis"
  // MongoDB is schemaless and has no SQL: no table structure/create-table,
  // no row edit/delete, no SQL export/import (see AGENTS.md "Not yet"). It
  // still gets the database (schema) selector, the rows grid, sorting and
  // CSV export — those already work against the backend's collection model.
  const isMongo = db.engine === "mongodb"
  // Which database on the server we are browsing; the primary by default.
  const [schemas, setSchemas] = useState<SchemaInfo[] | null>(null)
  const [schema, setSchema] = useState(db.databaseName)
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

  const openTable = (t: TableInfo) => {
    setSelected(t)
    setOffset(0)
    setOrder(null)
    setResult(null)
    setView("data")
    setColumns(null)
    loadRows(t, 0, null)
    if (!isRedis && !isMongo) loadColumns(t)
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

  // Row waiting for the delete confirmation; the dialog does the actual delete.
  const [rowToDelete, setRowToDelete] = useState<(string | null)[] | null>(null)
  // SQL file waiting for the "run it?" confirmation.
  const [fileToImport, setFileToImport] = useState<File | null>(null)

  const removeRow = async (
    values: (string | null)[]
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!selected || !columns) return { ok: true }
    const record = rowRecord(values)
    // The API requires `where` to be exactly the primary key — sending
    // every column would still work when there's nothing to disagree
    // with, but is not what assertRowTarget checks against.
    const where = Object.fromEntries(
      columns.filter((c) => c.isPrimaryKey).map((c) => [c.name, record[c.name]])
    )
    const r = await deleteRowAction(db.id, selected.name, where, {
      db: dbParam,
      schema: selected.schema,
    })
    if (!r.ok) return { ok: false, error: r.error }
    loadRows(selected, offset, order)
    return { ok: true }
  }

  if (!running) {
    return (
      <p className="text-xs text-muted-foreground">
        {t("browser.notRunning")}
      </p>
    )
  }

  const grid = result ?? rows

  const pkSummary = (values: (string | null)[]) => {
    const record = rowRecord(values)
    return (columns ?? [])
      .filter((c) => c.isPrimaryKey)
      .map((c) => `${c.name} = ${record[c.name] ?? "NULL"}`)
      .join(", ")
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <ConfirmDialog
        open={rowToDelete !== null}
        onOpenChange={(o) => !o && setRowToDelete(null)}
        title={t("browser.deleteRow.title")}
        description={
          rowToDelete && selected
            ? t.rich("browser.deleteRow.description", {
                pk: pkSummary(rowToDelete),
                table: selected.name,
                code: (chunks) => <code>{chunks}</code>,
              })
            : t("browser.deleteRow.descriptionFallback")
        }
        confirmLabel={t("browser.deleteRow.confirm")}
        onConfirm={() =>
          rowToDelete ? removeRow(rowToDelete) : Promise.resolve()
        }
      />
      <ConfirmDialog
        open={fileToImport !== null}
        onOpenChange={(o) => !o && setFileToImport(null)}
        title={
          fileToImport
            ? t("browser.import.title", { name: fileToImport.name })
            : t("browser.import.titleFallback")
        }
        description={
          fileToImport
            ? t.rich("browser.import.description", {
                name: fileToImport.name,
                size: (fileToImport.size / 1024).toFixed(0),
                db: schema,
                code: (chunks) => <code>{chunks}</code>,
              })
            : null
        }
        confirmLabel={t("browser.import.confirm")}
        tone="neutral"
        onConfirm={async () => {
          if (fileToImport) importFile(fileToImport)
        }}
      />
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
                    aria-label={t("browser.databaseAria")}
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
                            · {t("browser.primary")}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <CardTitle>
              {isRedis
                ? t("browser.list.keys")
                : isMongo
                  ? t("browser.list.collections")
                  : t("browser.list.tables")}
            </CardTitle>
            <div className="flex items-center">
              {canWrite &&
                db.engine !== "redis" &&
                db.engine !== "valkey" &&
                db.engine !== "mongodb" && (
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
                aria-label={t("browser.reloadList")}
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
            <p className="px-4 pb-4 text-xs text-muted-foreground">
              {tc("states.loading")}
            </p>
          ) : tables.length === 0 ? (
            <p className="px-4 pb-4 text-xs text-muted-foreground">
              {isRedis
                ? t("browser.empty.keys")
                : isMongo
                  ? t("browser.empty.collections")
                  : t("browser.empty.tables")}
            </p>
          ) : (
            <ul className="max-h-[480px] divide-y overflow-y-auto text-xs">
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
              <CardTitle>
                {isRedis
                  ? t("browser.query.titleKv", { engine: kvLabel })
                  : isMongo
                    ? t("browser.query.titleMongo")
                    : t("browser.query.titleSql")}
              </CardTitle>
              <div className="flex items-center gap-1">
                {canQuery && <QueryHistoryMenu databaseId={db.id} onPick={setSql} />}
                {!isRedis && !isMongo && (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={`/api/databases/${db.id}/export${dbParam ? `?db=${encodeURIComponent(dbParam)}` : ""}`}
                    >
                      <Download data-icon="inline-start" />
                      {t("browser.exportSql")}
                    </a>
                  </Button>
                )}
                {!isRedis && !isMongo && canWrite && (
                  <>
                    <input
                      ref={fileInput}
                      type="file"
                      accept=".sql,text/plain,application/sql"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        e.target.value = ""
                        if (f) setFileToImport(f)
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => fileInput.current?.click()}
                    >
                      <Upload data-icon="inline-start" />
                      {t("browser.importSql")}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <CardDescription>
              {isRedis
                ? t("browser.query.hintKv")
                : isMongo
                  ? t("browser.query.hintMongo")
                  : t("browser.query.hintSql")}{" "}
              {!canQuery
                ? t("browser.query.viewerHint")
                : !isMongo &&
                  (canWrite
                    ? t("browser.query.writeHint")
                    : t("browser.query.readOnlyHint"))}
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
                isRedis
                  ? "KEYS *"
                  : isMongo
                    ? "users.find({})"
                    : "select * from users order by id desc"
              }
              className="min-h-24 font-mono text-xs"
              spellCheck={false}
              disabled={!canQuery}
            />
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                disabled={pending || !sql.trim() || !canQuery}
                onClick={run}
              >
                <Play data-icon="inline-start" />
                {t("browser.query.run")}
              </Button>
              <span className="text-xs text-muted-foreground">Ctrl+Enter</span>
              {grid && (
                <span className="ms-auto text-xs text-muted-foreground">
                  {t("browser.query.summary", {
                    count: grid.rows.length,
                    ms: grid.durationMs,
                  })}
                  {grid.truncated && ` · ${t("browser.query.truncated")}`}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {notice && (
          <p className="rounded-md border p-3 text-xs" role="status">
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
                    ? t("browser.resultTitle")
                    : selected
                      ? `${selected.schema && selected.schema !== "public" ? `${selected.schema}.` : ""}${selected.name}`
                      : ""}
                </CardTitle>
                {grid?.message && (
                  <Badge variant="secondary">{grid.message}</Badge>
                )}
                {rows && !result && !isRedis && !isMongo && (
                  <div className="inline-flex overflow-hidden rounded-md border text-xs">
                    <button
                      type="button"
                      onClick={() => setView("data")}
                      className={`px-2 py-1 ${view === "data" ? "bg-muted font-medium" : "text-muted-foreground"}`}
                    >
                      {t("browser.tabs.data")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("structure")}
                      className={`border-s px-2 py-1 ${view === "structure" ? "bg-muted font-medium" : "text-muted-foreground"}`}
                    >
                      {t("browser.tabs.structure")}
                    </button>
                  </div>
                )}
                {rows && !result && !isRedis && (
                  <Button
                    asChild
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("browser.exportCsv")}
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
                      ? t("browser.pager.empty")
                      : `${offset + 1}–${offset + rows.rows.length}`}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("browser.pager.previous")}
                      disabled={pending || offset === 0}
                      onClick={() => page(-PAGE)}
                    >
                      <ChevronLeft />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("browser.pager.next")}
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
                  <p className="px-4 pb-4 text-xs text-muted-foreground">
                    {tc("states.loading")}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("browser.structure.column")}</TableHead>
                        <TableHead>{tc("labels.type")}</TableHead>
                        <TableHead>{t("browser.structure.nullable")}</TableHead>
                        <TableHead>{t("browser.structure.default")}</TableHead>
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
                          <TableCell>{c.nullable ? tc("states.yes") : tc("states.no")}</TableCell>
                          <TableCell className="max-w-[220px] truncate font-mono text-muted-foreground">
                            {c.defaultValue ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              ) : !grid || grid.columns.length === 0 ? (
                <p className="px-4 pb-4 text-xs text-muted-foreground">
                  {tc("messages.noResults")}
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
                          <TableHead className="w-0">{tc("labels.actions")}</TableHead>
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
                                {t("browser.emptyValue")}
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
                                aria-label={t("browser.deleteRow.aria")}
                                onClick={() => setRowToDelete(r)}
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
