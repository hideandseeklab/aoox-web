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
