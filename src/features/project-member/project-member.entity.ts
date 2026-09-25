/** Mirrors the project members API (project module). */
export type ProjectRole = "admin" | "developer" | "viewer"

export interface ProjectMember {
  userId: string
  email: string
  name: string
  platformRole: string
  role: ProjectRole
  /** Creator or platform owner/admin: always admin, no row to edit. */
  implicit: boolean
}

export interface ProjectMembers {
  myRole: ProjectRole
  members: ProjectMember[]
}

export const PROJECT_ROLE_LABEL: Record<ProjectRole, string> = {
  admin: "Admin",
  developer: "Developer",
  viewer: "Viewer",
}
