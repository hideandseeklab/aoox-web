import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { ProxyConfigFile, ProxyPreset } from "./proxy-config.entity"

/** Owner/admin only (403 otherwise) — callers gate on canUseTerminal first. */
export async function listProxyConfig(
  serverId?: string
): Promise<ProxyConfigFile[]> {
  const qs = serverId ? `?serverId=${encodeURIComponent(serverId)}` : ""
  return api<ProxyConfigFile[]>(`/proxy/config${qs}`, {
    token: await requireToken(),
  })
}

export async function listProxyPresets(): Promise<ProxyPreset[]> {
  return api<ProxyPreset[]>("/proxy/config/presets", {
    token: await requireToken(),
  })
}
