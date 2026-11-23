/** Mirrors `ResourceStorageDto` in aoox-api (`GET /<kind>/:id/storage`). */
export type StorageTarget = "application" | "database" | "compose"

export interface StorageItem {
  kind: "volume" | "container" | "image" | "backups"
  name: string
  /** null = the daemon could not compute it. */
  bytes: number | null
  /** `backups` only: how many successful backup files the sum covers. */
  count?: number
  /** `container` only: a database's admin tool container. */
  role?: "companion"
}

export interface ResourceStorage {
  items: StorageItem[]
  /** Volumes + container layers + backups; the image is not included. */
  totalBytes: number | null
  /** ISO time the daemon measured; the answer may be cached up to 60 s. */
  measuredAt: string | null
  /** Why the Docker daemon could not be read (items are then empty). */
  unreachable: string | null
}
