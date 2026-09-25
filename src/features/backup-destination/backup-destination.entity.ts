/** Mirrors BackupDestinationDto in aoox-api (never carries the secret key). */
export interface BackupDestination {
  id: string
  name: string
  /** null = AWS S3 */
  endpoint: string | null
  region: string
  bucket: string
  prefix: string
  accessKeyId: string
  forcePathStyle: boolean
  createdAt: string
}

export interface BackupDestinationTestResult {
  ok: boolean
  message: string
}
