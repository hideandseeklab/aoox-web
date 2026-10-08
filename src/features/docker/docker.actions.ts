"use server"

import { revalidatePath } from "next/cache"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { DockerContainerLogs } from "./docker.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

function fail(err: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error:
      err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server",
  }
}

function qs(serverId: string | null, extra: Record<string, string> = {}) {
  const p = new URLSearchParams(extra)
  if (serverId) p.set("serverId", serverId)
  const s = p.toString()
  return s ? `?${s}` : ""
}

/** Ids come from the list the API returned; the API validates them again. */
const seg = encodeURIComponent

export async function containerAction(
  id: string,
  action: "start" | "stop" | "restart",
  serverId: string | null
): Promise<ActionResult> {
  try {
    await api(`/docker/containers/${seg(id)}/${action}${qs(serverId)}`, {
      method: "POST",
      token: await requireToken(),
    })
    revalidatePath("/infra/docker")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function removeContainerAction(
  id: string,
  force: boolean,
  serverId: string | null
): Promise<ActionResult> {
  try {
    await api(
      `/docker/containers/${seg(id)}${qs(serverId, force ? { force: "true" } : {})}`,
      { method: "DELETE", token: await requireToken() }
    )
    revalidatePath("/infra/docker")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function removeImageAction(
  id: string,
  serverId: string | null
): Promise<ActionResult> {
  try {
    await api(`/docker/images/${seg(id)}${qs(serverId)}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath("/infra/docker")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function pruneImagesAction(
  serverId: string | null
): Promise<ActionResult<{ deleted: number; reclaimedBytes: number }>> {
  try {
    const data = await api<{ deleted: number; reclaimedBytes: number }>(
      `/docker/images/prune${qs(serverId)}`,
      { method: "POST", token: await requireToken() }
    )
    revalidatePath("/infra/docker")
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

/** One-shot tail (not a stream); readable for aoox's own containers too. */
export async function containerLogsAction(
  id: string,
  tail: number,
  serverId: string | null
): Promise<ActionResult<DockerContainerLogs>> {
  try {
    const data = await api<DockerContainerLogs>(
      `/docker/containers/${seg(id)}/logs${qs(serverId, { tail: String(tail) })}`,
      { token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}
