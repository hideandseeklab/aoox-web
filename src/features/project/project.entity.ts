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
  /** A build/redeploy is in flight right now (active deployment/creating/deploying). */
  deploying: boolean
}

/** CPU/RAM/network snapshot, summed across every container the project owns. */
export interface ProjectResourceUsageSummary {
  cpuPercent: number | null
  memoryBytes: number
  netRxBytesPerSec: number | null
  netTxBytesPerSec: number | null
}

export type ProjectListItem = Project & {
  instances: ProjectInstance[]
  /** From the API's live sampler; null when nothing is running. */
  resourceUsage: ProjectResourceUsageSummary | null
}

/** One point of GET /projects/:id/resource-usage's history — same fields as the summary, plus the limit. */
export interface ProjectResourceUsagePoint extends ProjectResourceUsageSummary {
  at: string
  memoryLimitBytes: number
}

/** GET /projects/:id/resource-usage — live only, no historical ranges. */
export interface ProjectResourceUsageResponse {
  current: ProjectResourceUsagePoint | null
  history: ProjectResourceUsagePoint[]
  containers: number
}

/** Dashboard counters (GET /projects/summary). */
export interface ProjectSummary {
  total: number
  /** At least one running application, database or compose stack. */
  active: number
  inactive: number
}
