/** Mirrors ServerDto in aoox-api (server.service.ts). */
export interface Server {
  id: string
  name: string
  host: string
  port: number
  username: string
  /** False = authenticates with the platform key shown in Settings. */
  hasOwnKey: boolean
  /** Traefik on this server (Settings → Servers). */
  proxyHttpPort: number
  proxyHttpsPort: number
  acmeEmail: string | null
  acmeStaging: boolean
  /** Result of the API's periodic reachability check (no live call on page load). */
  health: {
    status: "unknown" | "up" | "down"
    checkedAt: string | null
    /** Since when the status is what it is (down since …). */
    since: string | null
    error: string | null
    /** Running managed containers seen by the last check. */
    monitoredContainers: number | null
  }
  createdAt: string
}

export interface PlatformSshKey {
  publicKey: string | null
  authorizeCommand: string | null
  error: string | null
}

export interface ServerTestResult {
  ok: boolean
  message: string
  /** Set when the platform key was rejected: run this on the server once. */
  authorizeCommand: string | null
}
