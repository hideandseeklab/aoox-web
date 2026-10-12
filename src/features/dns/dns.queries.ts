import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type {
  DnsConnection,
  DomainDnsOptions,
  ProxyDnsState,
} from "./dns.entity"

/** Every member may list them (names only) to pick one for a domain. */
export async function listDnsConnections(): Promise<DnsConnection[]> {
  return api<DnsConnection[]>("/dns-connections", {
    token: await requireToken(),
  })
}

/** Owner/admin only. */
export async function getProxyDns(serverId?: string): Promise<ProxyDnsState> {
  const q = serverId ? `?serverId=${encodeURIComponent(serverId)}` : ""
  return api<ProxyDnsState>(`/proxy/dns${q}`, { token: await requireToken() })
}

export async function getDomainDnsOptions(
  applicationId: string
): Promise<DomainDnsOptions> {
  return api<DomainDnsOptions>(`/applications/${applicationId}/dns-options`, {
    token: await requireToken(),
  })
}
