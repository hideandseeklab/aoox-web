import { redirect } from "next/navigation"
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

/**
 * For the "new application / stack / database" pages: a viewer can read the
 * project but not create anything (the API answers 403 on submit), so a direct
 * visit goes back to the project page instead of showing a form that cannot
 * work. Returns the members view (or null when it could not be read, in which
 * case the API still decides on submit) so the page does not fetch it twice.
 */
export async function redirectViewerToProject(
  projectId: string
): Promise<ProjectMembers | null> {
  const members = await listProjectMembers(projectId).catch(() => null)
  if (members?.myRole === "viewer") redirect(`/projects/${projectId}`)
  return members
}
