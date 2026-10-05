import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type {
  CompanionTool,
  DatabaseCompanion,
} from "./database-companion.entity"

export async function getCompanion(
  databaseId: string
): Promise<DatabaseCompanion | null> {
  try {
    return await api<DatabaseCompanion | null>(
      `/databases/${databaseId}/companion`,
      { token: await requireToken() }
    )
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export async function listCompanionOptions(
  databaseId: string
): Promise<CompanionTool[]> {
  try {
    const r = await api<{ tools: CompanionTool[] }>(
      `/databases/${databaseId}/companion/options`,
      { token: await requireToken() }
    )
    return r.tools
  } catch {
    return []
  }
}
