import type { DatabaseEngine } from "./managed-database.entity"

/** Column definition from the "Buat tabel" dialog. */
export interface ColumnDraft {
  name: string
  type: string
  /** Only for types that take a length (varchar). */
  length: string
  nullable: boolean
  primaryKey: boolean
  /** Raw SQL default (`0`, `'x'`, `now()`); empty = none. */
  defaultValue: string
}

export interface TypeOption {
  value: string
  label: string
  hasLength?: boolean
}

/** Per-engine type menu; `value` is emitted verbatim into the DDL. */
export const COLUMN_TYPES: Record<
  Exclude<DatabaseEngine, "redis">,
  TypeOption[]
> = {
  postgres: [
    { value: "serial", label: "serial (auto increment)" },
    { value: "bigserial", label: "bigserial (auto increment)" },
    { value: "integer", label: "integer" },
    { value: "bigint", label: "bigint" },
    { value: "numeric", label: "numeric" },
    { value: "double precision", label: "double precision" },
    { value: "boolean", label: "boolean" },
    { value: "varchar", label: "varchar(n)", hasLength: true },
    { value: "text", label: "text" },
    { value: "date", label: "date" },
    { value: "timestamp", label: "timestamp" },
    { value: "timestamptz", label: "timestamptz" },
    { value: "jsonb", label: "jsonb" },
    { value: "uuid", label: "uuid" },
  ],
  mysql: [
    { value: "int AUTO_INCREMENT", label: "int (auto increment)" },
    { value: "bigint AUTO_INCREMENT", label: "bigint (auto increment)" },
    { value: "int", label: "int" },
    { value: "bigint", label: "bigint" },
    { value: "decimal(10,2)", label: "decimal(10,2)" },
    { value: "double", label: "double" },
    { value: "boolean", label: "boolean" },
    { value: "varchar", label: "varchar(n)", hasLength: true },
    { value: "text", label: "text" },
    { value: "date", label: "date" },
    { value: "datetime", label: "datetime" },
    { value: "timestamp", label: "timestamp" },
    { value: "json", label: "json" },
  ],
  mariadb: [
    { value: "int AUTO_INCREMENT", label: "int (auto increment)" },
    { value: "bigint AUTO_INCREMENT", label: "bigint (auto increment)" },
    { value: "int", label: "int" },
    { value: "bigint", label: "bigint" },
    { value: "decimal(10,2)", label: "decimal(10,2)" },
    { value: "double", label: "double" },
    { value: "boolean", label: "boolean" },
    { value: "varchar", label: "varchar(n)", hasLength: true },
    { value: "text", label: "text" },
    { value: "date", label: "date" },
    { value: "datetime", label: "datetime" },
    { value: "timestamp", label: "timestamp" },
    { value: "json", label: "json" },
    { value: "uuid", label: "uuid" },
  ],
}

const IDENT = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/

export function emptyColumn(
  engine: Exclude<DatabaseEngine, "redis">
): ColumnDraft {
  return {
    name: "",
    type: COLUMN_TYPES[engine][2].value,
    length: "255",
    nullable: true,
    primaryKey: false,
    defaultValue: "",
  }
}

/**
 * Builds `CREATE TABLE` for the dialog, or throws a message the form can
 * show. Identifiers are restricted to plain names (no quoting needed) —
 * anything fancier belongs in the SQL box.
 */
export function buildCreateTable(
  engine: Exclude<DatabaseEngine, "redis">,
  table: string,
  columns: ColumnDraft[]
): string {
  const t = table.trim()
  if (!IDENT.test(t)) throw new Error("Nama tabel tidak valid (huruf/angka/_)")
  // Blank rows (the spare one the dialog starts with) are simply skipped.
  const cols = columns.filter((c) => c.name.trim())
  if (cols.length === 0) throw new Error("Tambahkan minimal satu kolom")
  const q = (n: string) => (engine === "postgres" ? `"${n}"` : `\`${n}\``)
  const types = COLUMN_TYPES[engine]
  const seen = new Set<string>()
  const defs: string[] = []
  const pks: string[] = []
  for (const c of cols) {
    const name = c.name.trim()
    if (!IDENT.test(name)) throw new Error(`Nama kolom tidak valid: "${name}"`)
    if (seen.has(name.toLowerCase()))
      throw new Error(`Kolom "${name}" ditulis dua kali`)
    seen.add(name.toLowerCase())
    const opt = types.find((o) => o.value === c.type)
    if (!opt) throw new Error(`Tipe tidak dikenal untuk kolom "${name}"`)
    let type = opt.value
    if (opt.hasLength) {
      const len = Number(c.length)
      if (!Number.isInteger(len) || len < 1 || len > 65535)
        throw new Error(`Panjang varchar tidak valid untuk "${name}"`)
      type = `${opt.value}(${len})`
    }
    const parts = [q(name), type]
    // Primary keys are NOT NULL by definition; serial/auto-increment too.
    if (!c.nullable || c.primaryKey) parts.push("NOT NULL")
    if (c.defaultValue.trim()) parts.push(`DEFAULT ${c.defaultValue.trim()}`)
    defs.push(parts.join(" "))
    if (c.primaryKey) pks.push(q(name))
  }
  if (pks.length) defs.push(`PRIMARY KEY (${pks.join(", ")})`)
  return `CREATE TABLE ${q(t)} (\n  ${defs.join(",\n  ")}\n)`
}
