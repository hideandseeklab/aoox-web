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
  /** True from the moment "Terapkan update" is confirmed until this panel is back on a new version. */
  applying: boolean
  applyStartedAt: string | null
  api: ImageUpdateStatus
  web: ImageUpdateStatus
}

/** Mirrors `InstanceUpdateProgress` — the cheap poll target while `applying`. */
export interface InstanceUpdateProgress {
  currentVersion: string
  applying: boolean
  applyStartedAt: string | null
}
