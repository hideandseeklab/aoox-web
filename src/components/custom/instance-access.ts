import type { ProxyStatus } from "@/features/proxy/proxy.entity"

/** One way to reach an instance from a browser: a label to show and the URL behind it. */
export interface AccessTarget {
  key: string
  label: string
  url: string
  /** Shown before the label when several services of a stack are listed. */
  service?: string
}

type ProxyPorts = Pick<ProxyStatus, "httpPort" | "httpsPort"> | null

/**
 * A host the platform proxy routes: `https://host` or `http://host`, plus the
 * proxy's port when it is not the scheme default (dev proxies listen on
 * 8088/8443). Apps on a remote server have their own proxy — pass `null` to
 * assume default ports.
 */
export function domainTarget(
  host: string,
  https: boolean,
  proxy: ProxyPorts,
  service?: string
): AccessTarget {
  const port = proxy ? (https ? proxy.httpsPort : proxy.httpPort) : null
  const standard = port === null || port === (https ? 443 : 80)
  return {
    key: `d:${service ?? ""}:${host}`,
    label: host,
    service,
    url: `${https ? "https" : "http"}://${host}${standard ? "" : `:${port}`}`,
  }
}

/**
 * A host-published port: reachable on the machine the panel runs on, so the
 * link uses the host the browser opened the panel with (`localhost` until
 * hydration, as everywhere else).
 */
export function portTarget(
  browserHost: string | null,
  hostPort: number,
  service?: string
): AccessTarget {
  return {
    key: `p:${service ?? ""}:${hostPort}`,
    label: `${browserHost ?? "<ip-server>"}:${hostPort}`,
    service,
    url: `http://${browserHost ?? "localhost"}:${hostPort}`,
  }
}
