export type GitProvider = "github" | "gitlab" | "generic"

export interface GitCredential {
  id: string
  name: string
  provider: GitProvider
  username: string
  createdAt: string
}
