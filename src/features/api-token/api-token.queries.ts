import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { ApiToken } from "./api-token.entity"

export async function listApiTokens(): Promise<ApiToken[]> {
  return api<ApiToken[]>("/api-tokens", { token: await requireToken() })
}
