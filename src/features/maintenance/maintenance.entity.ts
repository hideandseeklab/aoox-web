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
  /** Only populated when cleanup ran with pruneContainers: true. */
  containersRemoved?: string[]
  errors: string[]
}

/** A local aoox container whose project/app/database/stack row no longer exists. */
export interface OrphanContainer {
  id: string
  name: string
  kind: "application" | "database" | "companion" | "compose"
  image: string
  state: string
  ownerId: string
}

/** A volume declared in the compose file of a stack that no longer exists. */
export interface OrphanComposeVolume {
  name: string
  stack: string
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
  /** Report-only: compose-declared volumes of deleted stacks. Never removed by aoox. */
  orphanComposeVolumes?: OrphanComposeVolume[]
  /**
   * Report-only: anonymous volumes no container uses, counted over the whole
   * daemon (they cannot be attributed to aoox). Never removed by aoox.
   */
  danglingAnonymousVolumes?: { count: number; bytes: number }
  /** Local aoox containers left behind by projects/apps deleted on older versions. */
  orphanContainers?: OrphanContainer[]
  lastCleanup: CleanupReport | null
  running: boolean
}
