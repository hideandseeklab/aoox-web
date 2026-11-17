import type { ProxyStatus } from "@/features/proxy/proxy.entity"
import type { Server } from "@/features/server/server.entity"

/**
 * What the domain forms need to know about the Traefik that serves one
 * application: the aoox host's proxy, or the proxy of the remote server it
 * runs on. A remote server's ACME email and ports come from its saved proxy
 * settings (`GET /servers`, the same values the API builds the labels from),
 * which only platform owners/admins can read.
 */
export interface AppProxy {
  /** Whether that proxy has an ACME email (Let's Encrypt); null = not visible to this user. */
  acme: boolean | null
  /** Its published ports; null = unknown (links then use the default ports). */
  httpPort: number | null
  httpsPort: number | null
  /** True when the application runs on a remote server. */
  remote: boolean
}

export function appProxyFor({
  serverId,
  hostProxy,
  servers,
  proxyDnsEnabled,
}: {
  serverId: string | null | undefined
  hostProxy:
    | (Pick<ProxyStatus, "acmeEmail"> &
        Partial<Pick<ProxyStatus, "httpPort" | "httpsPort">>)
    | null
    | undefined
  /** `GET /servers`; empty for members (403). */
  servers: Server[]
  /** The application's proxy has DNS-01, which the API only allows with an ACME email. */
  proxyDnsEnabled?: boolean
}): AppProxy {
  if (!serverId) {
    return {
      acme: hostProxy ? !!hostProxy.acmeEmail : null,
      httpPort: hostProxy?.httpPort ?? null,
      httpsPort: hostProxy?.httpsPort ?? null,
      remote: false,
    }
  }
  const server = servers.find((s) => s.id === serverId)
  if (server) {
    return {
      acme: !!server.acmeEmail,
      httpPort: server.proxyHttpPort,
      httpsPort: server.proxyHttpsPort,
      remote: true,
    }
  }
  return {
    acme: proxyDnsEnabled ? true : null,
    httpPort: null,
    httpsPort: null,
    remote: true,
  }
}
