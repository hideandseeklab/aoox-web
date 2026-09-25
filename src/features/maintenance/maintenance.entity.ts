/** Mirrors DiskUsage / CleanupReport in aoox-api (maintenance module). */
export interface CleanupReport {
  startedAt: string
  deploymentsPruned: number
  imagesRemoved: number
  danglingImagesDeleted: number
  reclaimedBytes: number
  registryGc: "skipped" | "ok" | "failed"
  /** Railpack's BuildKit cache (own container), trimmed to BUILDKIT_CACHE_KEEP_GB. */
  buildkitCache: "skipped" | "ok" | "failed"
  /** Only populated when cleanup ran with pruneVolumes: true. */
  volumesRemoved: string[]
  errors: string[]
}

export interface DiskUsage {
  imagesBytes: number
  containersBytes: number
  volumesBytes: number
  buildCacheBytes: number
  reclaimableBytes: number
  prunableDeployments: number
  /** Local-daemon volumes named like aoox's own with no DB row left to own them. */
  orphanVolumes: string[]
  lastCleanup: CleanupReport | null
  running: boolean
}
