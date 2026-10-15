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

/** Port the engine listens on inside its container (mirror of aoox-api `engines.ts`). */
export const ENGINE_CONTAINER_PORT: Record<DatabaseEngine, number> = {
  postgres: 5432,
  mysql: 3306,
  mariadb: 3306,
  redis: 6379,
  valkey: 6379,
  mongodb: 27017,
}

/** Docker Hub image per engine (mirror of aoox-api `engines.ts`). */
export const ENGINE_IMAGE: Record<DatabaseEngine, string> = {
  postgres: "postgres",
  mysql: "mysql",
  mariadb: "mariadb",
  redis: "redis",
  valkey: "valkey/valkey",
  mongodb: "mongo",
}

export const ENGINE_DEFAULT_TAG: Record<DatabaseEngine, string> = {
  postgres: "16-alpine",
  mysql: "8",
  mariadb: "11",
  redis: "7-alpine",
  valkey: "8-alpine",
  mongodb: "7",
}

/** Postgres variant -> label + image + default tag (mirror of aoox-api `POSTGRES_VARIANTS`); the description is a message key (`form.variants.<variant>`). */
export const POSTGRES_VARIANT_INFO: Record<
  Exclude<PostgresVariant, null>,
  { label: string; image: string; defaultTag: string }
> = {
  pgvector: {
    label: "pgvector",
    image: "pgvector/pgvector",
    defaultTag: "pg16",
  },
  postgis: {
    label: "PostGIS",
    image: "postgis/postgis",
    defaultTag: "16-3.4",
  },
  timescaledb: {
    label: "TimescaleDB",
    image: "timescale/timescaledb",
    defaultTag: "latest-pg16",
  },
}

/** Image and default tag the API uses when the tag field is left empty. */
export function defaultImageFor(
  engine: DatabaseEngine,
  variant: PostgresVariant
): { image: string; tag: string } {
  if (engine === "postgres" && variant) {
    const v = POSTGRES_VARIANT_INFO[variant]
    return { image: v.image, tag: v.defaultTag }
  }
  return { image: ENGINE_IMAGE[engine], tag: ENGINE_DEFAULT_TAG[engine] }
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
