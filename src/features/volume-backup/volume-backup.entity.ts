/** Mirrors VolumeBackup in aoox-api (volume-backup module). */
export type VolumeBackupStatus = "running" | "success" | "failed"

export interface VolumeBackup {
  id: string
  applicationId: string
  mountId: string
  volume: string
  filename: string
  status: VolumeBackupStatus
  trigger: "manual" | "scheduled"
  sizeBytes: string | null
  destinationId: string | null
  remoteKey: string | null
  errorMessage: string | null
  createdAt: string
  finishedAt: string | null
  /** File is on this server; false = only the S3 copy remains (pulled on demand). */
  local: boolean
}
