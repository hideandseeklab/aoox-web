/** Mirrors the dns-provider DTOs in aoox-api (never carries the API token). */
export interface DnsConnection {
  id: string
  name: string
  provider: "cloudflare"
  accountId: string | null
  createdAt?: string
}

export interface DnsConnectionTestResult {
  ok: boolean
  message: string
  zones: string[]
}

/** ACME mode of an https host: HTTP-01 (default), DNS-01 per host, or one DNS-01 wildcard. */
export type CertMode = "http" | "dns" | "dns-wildcard"

/** `GET /proxy/dns`: DNS-01 state of one proxy (the aoox host or a remote server). */
export interface ProxyDnsState {
  serverId: string | null
  connectionId: string | null
  connectionName: string | null
  proxy: "not-installed" | "running" | "not-running"
  /** The running proxy container really has the DNS-01 resolver. */
  active: boolean
  acmeEmail: string | null
  needsRecreate: boolean
  usedBy: string[]
}

/** `GET /applications/:id/dns-options`. */
export interface DomainDnsOptions {
  proxyDnsEnabled: boolean
}
