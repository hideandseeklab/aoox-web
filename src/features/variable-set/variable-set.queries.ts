import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type {
  ProjectVariableSet,
  VariableSetDetail,
  VariableSetSummary,
} from "./variable-set.entity"

/** Sets visible to the caller, sorted by name. */
export async function listVariableSets(): Promise<VariableSetSummary[]> {
  return api<VariableSetSummary[]>("/variable-sets", {
    token: await requireToken(),
  })
}

/** One set with its environments; null when it is not visible (404). */
export async function getVariableSet(
  id: string
): Promise<VariableSetDetail | null> {
  try {
    return await api<VariableSetDetail>(`/variable-sets/${id}`, {
      token: await requireToken(),
    })
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400))
      return null
    throw err
  }
}

/** Sets shared with a project, with their environments, keys and users in it. */
export async function listProjectVariableSets(
  projectId: string
): Promise<ProjectVariableSet[]> {
  return api<ProjectVariableSet[]>(`/projects/${projectId}/variable-sets`, {
    token: await requireToken(),
  })
}
