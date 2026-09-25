/** Mirrors Job / JobRun in aoox-api (job module). */
export type JobTarget = "container" | "run"
export type JobRunStatus = "running" | "success" | "failed" | "timeout"

/** Who a job belongs to; drives the API path and the page to revalidate. */
export type JobOwner =
  | { kind: "application"; id: string }
  | { kind: "database"; id: string }
  | { kind: "compose"; id: string }

export function ownerBase(owner: JobOwner): string {
  return owner.kind === "application"
    ? `/applications/${owner.id}`
    : owner.kind === "database"
      ? `/databases/${owner.id}`
      : `/compose-apps/${owner.id}`
}

/** Web page of the owner (compose pages live under /compose, not /compose-apps). */
export function ownerPage(owner: JobOwner): string {
  return owner.kind === "compose" ? `/compose/${owner.id}` : ownerBase(owner)
}

export interface Job {
  id: string
  applicationId: string | null
  databaseId: string | null
  composeAppId: string | null
  /** Compose only. */
  service: string | null
  name: string
  cron: string | null
  command: string
  target: JobTarget
  enabled: boolean
  timeoutSeconds: number
  lastRunAt: string | null
  lastStatus: JobRunStatus | null
  createdAt: string
  updatedAt: string
}

export interface JobRun {
  id: string
  jobId: string
  status: JobRunStatus
  trigger: "manual" | "scheduled"
  exitCode: number | null
  output: string
  startedAt: string
  finishedAt: string | null
}
