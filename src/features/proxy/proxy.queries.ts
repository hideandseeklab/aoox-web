import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { ProxyStatus } from "./proxy.entity"

export async function getProxyStatus(): Promise<ProxyStatus> {
  return api<ProxyStatus>("/proxy", { token: await requireToken() })
}

/** Traefik on a remote server (read over SSH, so it can fail when the server is down). */
export async function getServerProxyStatus(id: string): Promise<ProxyStatus> {
  return api<ProxyStatus>(`/servers/${encodeURIComponent(id)}/proxy`, {
    token: await requireToken(),
  })
}
