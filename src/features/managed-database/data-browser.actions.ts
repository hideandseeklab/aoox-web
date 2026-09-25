"use server"

import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type {
  ColumnInfo,
  QueryHistoryEntry,
  QueryResult,
  RowActionResult,
  SchemaInfo,
  TableInfo,
  TableRows,
  TableRowsQuery,
} from "./data-browser.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

function fail(err: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error:
      err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server",
  }
}

export async function listTablesAction(
  databaseId: string,
  db?: string
): Promise<ActionResult<TableInfo[]>> {
  try {
    const qs = db ? `?db=${encodeURIComponent(db)}` : ""
    const data = await api<TableInfo[]>(
      `/databases/${databaseId}/tables${qs}`,
      { token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function fetchTableRowsAction(
  databaseId: string,
  table: string,
  query: TableRowsQuery
): Promise<ActionResult<TableRows>> {
  const qs = new URLSearchParams()
  if (query.db) qs.set("db", query.db)
  if (query.schema) qs.set("schema", query.schema)
  if (query.limit) qs.set("limit", String(query.limit))
  if (query.offset) qs.set("offset", String(query.offset))
  if (query.orderBy) qs.set("orderBy", query.orderBy)
  if (query.dir) qs.set("dir", query.dir)
  try {
    const data = await api<TableRows>(
      `/databases/${databaseId}/tables/${encodeURIComponent(table)}/rows?${qs}`,
      { token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function listColumnsAction(
  databaseId: string,
  table: string,
  opts: { db?: string; schema?: string | null } = {}
): Promise<ActionResult<ColumnInfo[]>> {
  const qs = new URLSearchParams()
  if (opts.db) qs.set("db", opts.db)
  if (opts.schema) qs.set("schema", opts.schema)
  try {
    const data = await api<ColumnInfo[]>(
      `/databases/${databaseId}/tables/${encodeURIComponent(table)}/columns?${qs}`,
      { token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

/** Updates one row, targeted by its whole primary key (see the API's assertRowTarget). */
export async function updateRowAction(
  databaseId: string,
  table: string,
  where: Record<string, string | null>,
  set: Record<string, string | null>,
  opts: { db?: string; schema?: string | null } = {}
): Promise<ActionResult<RowActionResult>> {
  try {
    const data = await api<RowActionResult>(
      `/databases/${databaseId}/tables/${encodeURIComponent(table)}/rows`,
      {
        method: "PATCH",
        body: { where, set, db: opts.db, schema: opts.schema ?? undefined },
        token: await requireToken(),
      }
    )
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteRowAction(
  databaseId: string,
  table: string,
  where: Record<string, string | null>,
  opts: { db?: string; schema?: string | null } = {}
): Promise<ActionResult<RowActionResult>> {
  try {
    const data = await api<RowActionResult>(
      `/databases/${databaseId}/tables/${encodeURIComponent(table)}/rows`,
      {
        method: "DELETE",
        body: { where, db: opts.db, schema: opts.schema ?? undefined },
        token: await requireToken(),
      }
    )
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function fetchQueryHistoryAction(
  databaseId: string
): Promise<ActionResult<QueryHistoryEntry[]>> {
  try {
    const data = await api<QueryHistoryEntry[]>(
      `/databases/${databaseId}/query-history`,
      { token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function clearQueryHistoryAction(
  databaseId: string
): Promise<ActionResult> {
  try {
    await api<void>(`/databases/${databaseId}/query-history`, {
      method: "DELETE",
      token: await requireToken(),
    })
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function runQueryAction(
  databaseId: string,
  sql: string,
  db?: string
): Promise<ActionResult<QueryResult>> {
  try {
    const data = await api<QueryResult>(`/databases/${databaseId}/query`, {
      method: "POST",
      body: db ? { sql, db } : { sql },
      token: await requireToken(),
    })
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function listSchemasAction(
  databaseId: string
): Promise<ActionResult<SchemaInfo[]>> {
  try {
    const data = await api<SchemaInfo[]>(`/databases/${databaseId}/schemas`, {
      token: await requireToken(),
    })
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function createSchemaAction(
  databaseId: string,
  name: string
): Promise<ActionResult<SchemaInfo>> {
  try {
    const data = await api<SchemaInfo>(`/databases/${databaseId}/schemas`, {
      method: "POST",
      body: { name },
      token: await requireToken(),
    })
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function dropSchemaAction(
  databaseId: string,
  name: string
): Promise<ActionResult> {
  try {
    await api<void>(
      `/databases/${databaseId}/schemas/${encodeURIComponent(name)}`,
      { method: "DELETE", token: await requireToken() }
    )
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

const API_URL = process.env.API_URL ?? "http://localhost:3001"

/**
 * Uploads a .sql file to run against one database. Multipart, so it goes
 * straight to fetch rather than through the JSON `api()` helper.
 */
export async function importSqlAction(
  databaseId: string,
  db: string | undefined,
  formData: FormData
): Promise<ActionResult<{ message: string }>> {
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Pilih file .sql dulu" }
  }
  const body = new FormData()
  body.set("file", file, file.name)
  const qs = db ? `?db=${encodeURIComponent(db)}` : ""
  try {
    const res = await fetch(
      `${API_URL}/databases/${encodeURIComponent(databaseId)}/import${qs}`,
      {
        method: "POST",
        body,
        headers: { Authorization: `Bearer ${await requireToken()}` },
      }
    )
    const json = (await res.json().catch(() => ({}))) as {
      message?: string | string[]
    }
    if (!res.ok) {
      const m = json.message
      return {
        ok: false,
        error: Array.isArray(m) ? m.join(", ") : (m ?? `HTTP ${res.status}`),
      }
    }
    return {
      ok: true,
      data: { message: String(json.message ?? "Import selesai") },
    }
  } catch {
    return { ok: false, error: "Tidak dapat terhubung ke server" }
  }
}
