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
  version: InstanceVersionInfo
}

/** Newest published version vs the running one — the signal the sidebar badge uses. */
export interface InstanceVersionInfo {
  currentVersion: string
  /** `latest` = follows :latest; `pinned` = explicit tag; `unknown` = could not tell. */
  tracking: "latest" | "pinned" | "unknown"
  trackedTag: string | null
  latestVersion: string | null
  latestCheckedAt: string | null
  updateAvailable: boolean
  applying: boolean
}

/** Mirrors `InstanceUpdateProgress` — the cheap poll target while `applying`. */
export interface InstanceUpdateProgress {
  currentVersion: string
  applying: boolean
  applyStartedAt: string | null
}
