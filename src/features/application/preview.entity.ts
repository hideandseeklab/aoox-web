/** Mirrors PreviewDeployment in aoox-api. */
export type PreviewStatus = "building" | "running" | "failed" | "closed"

export interface PreviewDeployment {
  id: string
  applicationId: string
  prNumber: number
  title: string
  branch: string
  commitSha: string | null
  prUrl: string | null
  host: string | null
  status: PreviewStatus
  imageRef: string | null
  logs: string
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}
