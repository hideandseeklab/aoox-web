export interface ImageUpdateStatus {
  image: string
  currentDigest: string | null
  /** Null when the registry lookup failed (see `error`). */
  remoteDigest: string | null
  updateAvailable: boolean
  /** Short reason the lookup failed, null when it worked. */
  error: string | null
}

/** Mirrors `InstanceUpdateStatus` in the API (instance-update module). */
export interface InstanceUpdateStatus {
  currentVersion: string
  installDirConfigured: boolean
  checkedAt: string | null
  /** True from the moment "Apply update" is confirmed until this panel is back on a new version. */
  applying: boolean
  applyStartedAt: string | null
  api: ImageUpdateStatus
  web: ImageUpdateStatus
  version: InstanceVersionInfo
  /**
   * Why applying would not change the version (a pinned install whose tag did
   * not move); null when applying makes sense. The API answers 409 with a
   * similar text if it is applied anyway.
   */
  applyBlocked: string | null
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
