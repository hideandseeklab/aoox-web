export type DatabaseEngine = "postgres" | "mysql" | "mariadb" | "redis"
export type ManagedDatabaseStatus = "creating" | "running" | "stopped" | "error"

export const ENGINE_LABEL: Record<DatabaseEngine, string> = {
  postgres: "PostgreSQL",
  mysql: "MySQL",
  mariadb: "MariaDB",
  redis: "Redis",
}

export const ENGINE_DEFAULT_TAG: Record<DatabaseEngine, string> = {
  postgres: "16-alpine",
  mysql: "8",
  mariadb: "11",
  redis: "7-alpine",
}

export interface ManagedDatabase {
  id: string
  projectId: string
  name: string
  slug: string
  engine: DatabaseEngine
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
