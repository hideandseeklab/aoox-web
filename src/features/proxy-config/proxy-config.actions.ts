"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type {
  PresetResult,
  ProxyConfigDetail,
  ProxyConfigFile,
  ProxyConfigState,
  ProxyConfigSync,
  ProxyConfigWrite,
} from "./proxy-config.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

async function fail(err: unknown): Promise<{ ok: false; error: string }> {
  const t = await getTranslations("infra.errors")
  return {
    ok: false,
    error: err instanceof ApiError ? err.message : t("serverUnreachable"),
  }
}

const query = (serverId: string | null) =>
  serverId ? `?serverId=${encodeURIComponent(serverId)}` : ""

export async function listProxyConfigAction(
  serverId: string | null
): Promise<ActionResult<ProxyConfigFile[]>> {
  try {
    const data = await api<ProxyConfigFile[]>(
      `/proxy/config${query(serverId)}`,
      { token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function getProxyConfigAction(
  id: string
): Promise<ActionResult<ProxyConfigDetail>> {
  try {
    const data = await api<ProxyConfigDetail>(`/proxy/config/${id}`, {
      token: await requireToken(),
    })
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function createProxyConfigAction(input: {
  name: string
  content: string
  enabled: boolean
  serverId: string | null
  acceptProxyRestart?: boolean
}): Promise<ActionResult<ProxyConfigWrite>> {
  try {
    const data = await api<ProxyConfigWrite>("/proxy/config", {
      method: "POST",
      body: {
        name: input.name,
        content: input.content,
        enabled: input.enabled,
        ...(input.acceptProxyRestart ? { acceptProxyRestart: true } : {}),
        ...(input.serverId ? { serverId: input.serverId } : {}),
      },
      token: await requireToken(),
    })
    revalidatePath("/infra/proxy")
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function updateProxyConfigAction(
  id: string,
  patch: {
    content?: string
    enabled?: boolean
    acceptProxyRestart?: boolean
  }
): Promise<ActionResult<ProxyConfigWrite>> {
  try {
    const data = await api<ProxyConfigWrite>(`/proxy/config/${id}`, {
      method: "PUT",
      body: patch,
      token: await requireToken(),
    })
    revalidatePath("/infra/proxy")
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteProxyConfigAction(
  id: string
): Promise<ActionResult> {
  try {
    await api<void>(`/proxy/config/${id}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath("/infra/proxy")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function proxyConfigStateAction(
  serverId: string | null
): Promise<ActionResult<ProxyConfigState>> {
  try {
    const data = await api<ProxyConfigState>(
      `/proxy/config/status${query(serverId)}`,
      { token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function syncProxyConfigAction(
  serverId: string | null,
  acceptProxyRestart = false
): Promise<ActionResult<ProxyConfigSync>> {
  try {
    const qs = new URLSearchParams()
    if (serverId) qs.set("serverId", serverId)
    if (acceptProxyRestart) qs.set("acceptProxyRestart", "true")
    const data = await api<ProxyConfigSync>(
      `/proxy/config/sync${qs.size ? `?${qs}` : ""}`,
      { method: "POST", token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

/** Builds the YAML for a preset. The password only travels in this request body. */
export async function renderPresetAction(
  preset: string,
  params: Record<string, unknown>
): Promise<ActionResult<PresetResult>> {
  try {
    const data = await api<PresetResult>(`/proxy/config/presets/${preset}`, {
      method: "POST",
      body: { params },
      token: await requireToken(),
    })
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}
