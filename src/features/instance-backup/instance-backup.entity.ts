/** Mirrors `InstanceBackup` in the API (instance-backup module). */
export interface InstanceBackup {
  id: string
  filename: string
  status: "success" | "failed"
  trigger: "manual" | "scheduled"
  sizeBytes: string | null
  rowCount: number
  schemaVersion: string | null
  destinationId: string | null
  remoteKey: string | null
  errorMessage: string | null
  createdAt: string
  /** File still present in this server's backups volume. */
  local: boolean
}

export interface InstanceBackupSettings {
  backupCron: string | null
  backupKeep: number
  destinationId: string | null
}

export interface RestoreReport {
  tables: number
  rows: number
  schemaVersion: string | null
  warnings: string[]
}
