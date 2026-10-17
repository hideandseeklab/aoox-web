"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { SwarmNode, SwarmStatus } from "./swarm.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

async function fail(err: unknown): Promise<{ ok: false; error: string }> {
  const t = await getTranslations("infra.errors")
  return {
    ok: false,
    error: err instanceof ApiError ? err.message : t("serverUnreachable"),
  }
}

export async function initSwarmAction(
  advertiseAddr: string
): Promise<ActionResult<SwarmStatus>> {
  try {
    const data = await api<SwarmStatus>("/swarm/init", {
      method: "POST",
      body: advertiseAddr.trim() ? { advertiseAddr: advertiseAddr.trim() } : {},
      token: await requireToken(),
    })
    revalidatePath("/infra/swarm")
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function leaveSwarmAction(): Promise<ActionResult> {
  try {
    await api<void>("/swarm", { method: "DELETE", token: await requireToken() })
    revalidatePath("/infra/swarm")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function updateNodeAction(
  id: string,
  patch: {
    availability?: SwarmNode["availability"]
    role?: SwarmNode["role"]
    labels?: Record<string, string>
  }
): Promise<ActionResult<SwarmNode>> {
  try {
    const data = await api<SwarmNode>(`/swarm/nodes/${id}`, {
      method: "PATCH",
      body: patch,
      token: await requireToken(),
    })
    revalidatePath("/infra/swarm")
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function removeNodeAction(
  id: string,
  force: boolean
): Promise<ActionResult> {
  try {
    await api<void>(`/swarm/nodes/${id}?force=${force}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath("/infra/swarm")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}
