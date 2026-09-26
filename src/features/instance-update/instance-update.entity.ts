export interface ImageUpdateStatus {
  image: string
  currentDigest: string | null
  remoteDigest: string
  updateAvailable: boolean
}

/** Mirrors `InstanceUpdateStatus` in the API (instance-update module). */
export interface InstanceUpdateStatus {
  currentVersion: string
  installDirConfigured: boolean
  checkedAt: string | null
  api: ImageUpdateStatus
  web: ImageUpdateStatus
}
