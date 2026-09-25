import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { Project, ProjectListItem, ProjectSummary } from "./project.entity"

export async function listProjects(
  search?: string
): Promise<ProjectListItem[]> {
  const token = await requireToken()
  const qs = search ? `?search=${encodeURIComponent(search)}` : ""
  return api<ProjectListItem[]>(`/projects${qs}`, { token })
}

export async function getProject(id: string): Promise<Project | null> {
  const token = await requireToken()
  try {
    return await api<Project>(`/projects/${id}`, { token })
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
      return null
    }
    throw err
  }
}

export async function getProjectSummary(): Promise<ProjectSummary> {
  return api<ProjectSummary>("/projects/summary", {
    token: await requireToken(),
  })
}
