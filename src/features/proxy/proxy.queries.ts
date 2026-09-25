import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { ProxyStatus } from "./proxy.entity"

export async function getProxyStatus(): Promise<ProxyStatus> {
  return api<ProxyStatus>("/proxy", { token: await requireToken() })
}
