import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { GitCredential } from "./git-credential.entity"

export async function listGitCredentials(): Promise<GitCredential[]> {
  return api<GitCredential[]>("/git-credentials", {
    token: await requireToken(),
  })
}
