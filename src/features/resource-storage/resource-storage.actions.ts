"use server"

import type { ResourceStorage, StorageTarget } from "./resource-storage.entity"
import { getResourceStorage } from "./resource-storage.queries"

/** Called by the Storage card on mount and on refresh; null when the API call itself failed. */
export async function fetchResourceStorageAction(
  target: StorageTarget,
  id: string
): Promise<ResourceStorage | null> {
  try {
    return await getResourceStorage(target, id)
  } catch {
    return null
  }
}
