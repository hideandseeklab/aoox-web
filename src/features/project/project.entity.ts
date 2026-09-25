export interface Project {
  id: string
  name: string
  description: string | null
  /** Shared `KEY=VALUE` lines inherited by every application. */
  env: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

export type ProjectInstanceKind = "application" | "database" | "compose"

/** One deployable inside a project (GET /projects). */
export interface ProjectInstance {
  kind: ProjectInstanceKind
  id: string
  name: string
  /** Status as last observed by the API (`running` = active). */
  status: string
  engine: string | null
}

export type ProjectListItem = Project & { instances: ProjectInstance[] }

/** Dashboard counters (GET /projects/summary). */
export interface ProjectSummary {
  total: number
  /** At least one running application, database or compose stack. */
  active: number
  inactive: number
}
