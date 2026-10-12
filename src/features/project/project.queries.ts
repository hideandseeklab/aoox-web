import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { ProjectEnvironment } from "./project-environment.entity"
import type {
  Project,
  ProjectListItem,
  ProjectResourceUsageResponse,
  ProjectSummary,
} from "./project.entity"

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

/** Live CPU/RAM/network for the project detail page's resource card. */
export async function getProjectResourceUsage(
  id: string
): Promise<ProjectResourceUsageResponse> {
  return api<ProjectResourceUsageResponse>(`/projects/${id}/resource-usage`, {
    token: await requireToken(),
  })
}

/** Names, protection, variable names and users of each environment (never values). */
export async function listProjectEnvironments(
  projectId: string
): Promise<ProjectEnvironment[]> {
  return api<ProjectEnvironment[]>(`/projects/${projectId}/environments`, {
    token: await requireToken(),
  })
}
