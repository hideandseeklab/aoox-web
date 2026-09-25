/** Mirrors ComposeApp / ComposeAppDetail in aoox-api (compose module). */
export type ComposeAppStatus =
  "idle" | "deploying" | "running" | "stopped" | "error"

export type ComposeAppSource = "git" | "template"

/** A stack service published through the platform proxy. */
export interface ComposeServiceDomain {
  service: string
  port: number
  host: string
  https: boolean
}

/** A stack service published on a host port (access by IP, no proxy). */
export interface ComposeServicePort {
  service: string
  /** Container port. */
  port: number
  hostPort: number
}

/** A CPU/RAM cap for one service; either field null/undefined = unlimited for it. */
export interface ComposeServiceResources {
  service: string
  cpuMillicores: number | null
  memoryMb: number | null
}

export interface ComposeApp {
  id: string
  projectId: string
  name: string
  slug: string
  source: ComposeAppSource
  templateId: string | null
  /** Compose file for `template` stacks (null for git). */
  composeContent: string | null
  serviceDomains: ComposeServiceDomain[]
  servicePorts: ComposeServicePort[]
  serviceResources: ComposeServiceResources[]
  gitUrl: string | null
  gitBranch: string
  gitCredentialId: string | null
  composePath: string
  env: string
  status: ComposeAppStatus
  errorMessage: string | null
  deployedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ComposeContainer {
  id: string
  name: string
  service: string
  state: string
  status: string
}

export interface ComposeAppDetail extends ComposeApp {
  /** Output of the last action (live output while one runs). */
  logs: string
  containers: ComposeContainer[]
  /** Run the logs belong to, for the history view. */
  deploymentId: string | null
}

export type ComposeDeploymentAction = "deploy" | "stop" | "start" | "down"
export type ComposeDeploymentTrigger = "manual" | "webhook"
export type ComposeDeploymentStatus = "running" | "success" | "failed"

/** One run of the compose helper (`compose_deployments` in the API). */
export interface ComposeDeployment {
  id: string
  composeAppId: string
  action: ComposeDeploymentAction
  trigger: ComposeDeploymentTrigger
  status: ComposeDeploymentStatus
  errorMessage: string | null
  commitSha: string | null
  startedAt: string
  finishedAt: string | null
}

export interface ComposeDeploymentDetail extends ComposeDeployment {
  logs: string
}

/** Live CPU/RAM per stack service, from the background sampler. */
export interface ComposeServiceMetrics {
  containerId: string
  name: string
  service: string
  current: {
    at: string
    cpuPercent: number | null
    memoryBytes: number
    memoryLimitBytes: number
  } | null
}

export interface ComposeMetrics {
  services: ComposeServiceMetrics[]
  total: { cpuPercent: number; memoryBytes: number; containers: number }
}
