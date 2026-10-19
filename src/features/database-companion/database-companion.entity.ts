export type CompanionStatus = "creating" | "running" | "stopped" | "error"

export interface CompanionTool {
  id: string
  label: string
  description: string
  /** True when the tool signs in with the database's own credentials. */
  usesDatabaseLogin: boolean
}

export interface DatabaseCompanion {
  id: string
  tool: string
  status: CompanionStatus
  errorMessage: string | null
  host: string | null
  https: boolean
  hostPort: number | null
  hostPortBind: "public" | "loopback"
  /** The only way in is a host port bound to 127.0.0.1: reachable from the server itself (SSH tunnel) only. */
  loopbackOnly: boolean
  url: string | null
  username: string | null
  createdAt: string
}

export interface CompanionCredentials {
  username: string | null
  password: string | null
}
