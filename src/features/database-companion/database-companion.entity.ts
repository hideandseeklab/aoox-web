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
  url: string | null
  username: string | null
  createdAt: string
}

export interface CompanionCredentials {
  username: string | null
  password: string | null
}
