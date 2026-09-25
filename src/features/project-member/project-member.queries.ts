import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { ProjectMembers } from "./project-member.entity"

export async function listProjectMembers(
  projectId: string
): Promise<ProjectMembers> {
  return api<ProjectMembers>(`/projects/${projectId}/members`, {
    token: await requireToken(),
  })
}
