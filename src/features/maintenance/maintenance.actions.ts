"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { CleanupReport } from "./maintenance.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

/** Synchronous on the API (up to a minute or so with registry GC). */
export async function runCleanupAction(
  registryGc: boolean,
  pruneVolumes = false,
  pruneContainers = false
): Promise<ActionResult<CleanupReport>> {
  try {
    const data = await api<CleanupReport>("/maintenance/cleanup", {
      method: "POST",
      body: { registryGc, pruneVolumes, pruneContainers },
      token: await requireToken(),
    })
    revalidatePath("/infra/docker")
    return { ok: true, data }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof ApiError
          ? err.message
          : (await getTranslations("infra.errors"))("serverUnreachable"),
    }
  }
}

/** The API re-checks that the container is still an orphan before removing it. */
export async function removeOrphanContainerAction(
  id: string
): Promise<ActionResult> {
  try {
    await api(`/maintenance/orphan-containers/${id}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath("/infra/docker")
    return { ok: true, data: undefined }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof ApiError
          ? err.message
          : (await getTranslations("infra.errors"))("serverUnreachable"),
    }
  }
}
