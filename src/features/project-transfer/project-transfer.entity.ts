/** Mirrors `ImportReport` in the API (project-transfer module). */
export interface ImportReport {
  projectId: string
  created: {
    applications: number
    databases: number
    composeApps: number
    domains: number
    mounts: number
    jobs: number
  }
  warnings: string[]
}
