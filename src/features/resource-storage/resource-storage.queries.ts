import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { ResourceStorage, StorageTarget } from "./resource-storage.entity"

/** The compose path does not pluralize like the other two (`/compose-apps`). */
const TARGET_PATH: Record<StorageTarget, string> = {
  application: "applications",
  database: "databases",
  compose: "compose-apps",
}

export async function getResourceStorage(
  target: StorageTarget,
  id: string
): Promise<ResourceStorage> {
  return api<ResourceStorage>(`/${TARGET_PATH[target]}/${id}/storage`, {
    token: await requireToken(),
  })
}
