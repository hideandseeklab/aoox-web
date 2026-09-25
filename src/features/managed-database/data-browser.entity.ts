/** Mirrors data-browser.dto.ts in aoox-api. */
export interface TableInfo {
  schema: string | null
  name: string
  estimatedRows: number | null
}

export interface QueryResult {
  columns: string[]
  rows: (string | null)[][]
  truncated: boolean
  message: string | null
  durationMs: number
}

export interface TableRows extends QueryResult {
  hasMore: boolean
}

export interface TableRowsQuery {
  /** Another database on the same server; undefined = the primary one. */
  db?: string
  schema?: string | null
  limit?: number
  offset?: number
  orderBy?: string
  dir?: "asc" | "desc"
}

/** A database (Postgres) / schema (MySQL, MariaDB) on the managed server. */
export interface SchemaInfo {
  name: string
  isPrimary: boolean
}

export interface ColumnInfo {
  name: string
  dataType: string
  nullable: boolean
  defaultValue: string | null
  isPrimaryKey: boolean
}

export interface RowActionResult {
  message: string
}

export interface QueryHistoryEntry {
  id: string
  /** Another database on the same server; null = the primary one. */
  db: string | null
  sql: string
  success: boolean
  errorMessage: string | null
  rowCount: number | null
  durationMs: number
  createdAt: string
}
