"use server"

import { revalidatePath } from "next/cache"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { CleanupReport } from "./maintenance.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

/** Synchronous on the API (up to a minute or so with registry GC). */
export async function runCleanupAction(
  registryGc: boolean,
  pruneVolumes = false
): Promise<ActionResult<CleanupReport>> {
  try {
    const data = await api<CleanupReport>("/maintenance/cleanup", {
      method: "POST",
      body: { registryGc, pruneVolumes },
      token: await requireToken(),
    })
    revalidatePath("/settings")
    return { ok: true, data }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof ApiError
          ? err.message
          : "Tidak dapat terhubung ke server",
    }
  }
}
