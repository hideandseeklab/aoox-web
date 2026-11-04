"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type {
  LeaveSwarmResult,
  SwarmNode,
  SwarmStatus,
} from "./swarm.entity"

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
  input: { advertiseAddr: string; listenAddr: string; overlayMtu: string }
): Promise<ActionResult<SwarmStatus>> {
  try {
    const mtu = Number(input.overlayMtu.trim())
    const data = await api<SwarmStatus>("/swarm/init", {
      method: "POST",
      body: {
        ...(input.advertiseAddr.trim()
          ? { advertiseAddr: input.advertiseAddr.trim() }
          : {}),
        ...(input.listenAddr.trim()
          ? { listenAddr: input.listenAddr.trim() }
          : {}),
        ...(input.overlayMtu.trim() ? { overlayMtu: mtu } : {}),
      },
      token: await requireToken(),
    })
    revalidatePath("/infra/swarm")
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function leaveSwarmAction(): Promise<
  ActionResult<LeaveSwarmResult>
> {
  try {
    // Older APIs answer 204 without a body: the restart notice is then unknown,
    // so assume it applies (the bug is in Docker, not in aoox).
    const res = await api<LeaveSwarmResult | undefined>("/swarm", {
      method: "DELETE",
      token: await requireToken(),
    })
    // No revalidatePath here: after a leave Docker's DNS no longer resolves
    // the api container for this server, so re-rendering the page would throw
    // (error page) and swallow the restart alert. The card hides what the
    // leave made stale instead; a reload after the Docker restart is fresh.
    return {
      ok: true,
      data: res ?? { restartDockerRequired: true, notice: null },
    }
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
