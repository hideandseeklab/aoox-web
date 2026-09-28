export type DatabaseEngine =
  "postgres" | "mysql" | "mariadb" | "redis" | "valkey" | "mongodb"
export type ManagedDatabaseStatus = "creating" | "running" | "stopped" | "error"
/** Postgres only; a different preinstalled-extension image, same wire protocol. */
export type PostgresVariant = "pgvector" | "postgis" | "timescaledb" | null

export const ENGINE_LABEL: Record<DatabaseEngine, string> = {
  postgres: "PostgreSQL",
  mysql: "MySQL",
  mariadb: "MariaDB",
  redis: "Redis",
  valkey: "Valkey",
  mongodb: "MongoDB",
}

export const ENGINE_DEFAULT_TAG: Record<DatabaseEngine, string> = {
  postgres: "16-alpine",
  mysql: "8",
  mariadb: "11",
  redis: "7-alpine",
  valkey: "8-alpine",
  mongodb: "7",
}

/** Postgres variant -> label + one-line description, shown in the create dialog. */
export const POSTGRES_VARIANT_INFO: Record<
  Exclude<PostgresVariant, null>,
  { label: string; description: string; defaultTag: string }
> = {
  pgvector: {
    label: "pgvector",
    description: "Vector similarity search for embeddings (AI/ML workloads).",
    defaultTag: "pg16",
  },
  postgis: {
    label: "PostGIS",
    description: "Geographic/spatial data types, indexes and queries.",
    defaultTag: "16-3.4",
  },
  timescaledb: {
    label: "TimescaleDB",
    description: "Time-series data: hypertables, continuous aggregates.",
    defaultTag: "latest-pg16",
  },
}

export interface ManagedDatabase {
  id: string
  projectId: string
  name: string
  slug: string
  engine: DatabaseEngine
  variant: PostgresVariant
  imageTag: string
  databaseName: string
  username: string
  hostPort: number | null
  cpuMillicores: number | null
  memoryMb: number | null
  status: ManagedDatabaseStatus
  backupCron: string | null
  backupKeep: number
  /** Dump every database on the server, not only the primary one. */
  backupAllDatabases: boolean
  /** Backup destination (S3) copies go to; null = local volume only. */
  backupDestinationId: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface ManagedDatabaseDetail extends ManagedDatabase {
  container: { id: string; state: string; status: string } | null
  /** The signed-in user's role in the owning project. */
  projectRole: "admin" | "developer" | "viewer"
}

export interface DatabaseConnection {
  username: string
  password: string
  database: string
  internalHost: string
  internalPort: number
  internalUrl: string
  externalHost: string | null
  externalPort: number | null
  externalUrl: string | null
}

export type BackupStatus = "running" | "success" | "failed"

export interface DatabaseBackup {
  id: string
  databaseId: string
  filename: string
  status: BackupStatus
  trigger: "manual" | "scheduled"
  /** `all` = every non-system database on the server (restores the same way). */
  scope: "database" | "all"
  sizeBytes: string | null
  destinationId: string | null
  /** Object key in the destination bucket once uploaded. */
  remoteKey: string | null
  errorMessage: string | null
  createdAt: string
  finishedAt: string | null
  /** File is on this server; false = only the S3 copy remains (pulled on demand). */
  local: boolean
}
