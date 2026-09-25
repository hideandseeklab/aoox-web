export type BuildType = "dockerfile" | "nixpacks" | "railpack" | "static"
export type SourceType = "git" | "image"
export type DeployMode = "container" | "service"

export type ApplicationStatus = "idle" | "running" | "stopped" | "error"
export type DeploymentStatus =
  "queued" | "building" | "pushing" | "starting" | "success" | "failed"

export const ACTIVE_DEPLOYMENT_STATUSES: DeploymentStatus[] = [
  "queued",
  "building",
  "pushing",
  "starting",
]

export interface Application {
  id: string
  projectId: string
  name: string
  appName: string
  sourceType: SourceType
  gitUrl: string | null
  imageRef: string | null
  imageRegistryId: string | null
  /** Image source: redeploy when the tag's digest changes in the registry. */
  autoUpdate: boolean
  autoUpdateIntervalMinutes: number
  imageDigest: string | null
  imageCheckedAt: string | null
  /** `service` = swarm service on the host (replicas, rolling update). */
  deployMode: DeployMode
  replicas: number
  /** Service mode: node id to pin tasks to; null = any node (apps with mounts stay on the host). */
  swarmNodeId: string | null
  /** Extra placement constraint (`node.labels.zone==eu`). */
  swarmConstraint: string | null
  updateParallelism: number
  updateDelaySeconds: number
  updateOrder: "auto" | "start-first" | "stop-first"
  gitBranch: string
  dockerfilePath: string
  gitCredentialId: string | null
  containerPort: number
  hostPort: number | null
  /** HTTP path probed in the container; enables health-gated (blue/green) deploys. */
  healthcheckPath: string | null
  backupCron: string | null
  backupKeep: number
  backupDestinationId: string | null
  /** CPU limit in millicores (1000 = one core); null = unlimited. */
  cpuMillicores: number | null
  /** Memory limit in MiB; null = unlimited. */
  memoryMb: number | null
  deploymentKeep: number
  env: string
  /** `KEY=VALUE` lines passed as Docker build args (not secrets). */
  buildArgs: string
  /** `dockerfile` builds the repo's Dockerfile; `nixpacks` auto-detects the stack. */
  buildType: BuildType
  staticBuildCommand: string | null
  staticOutputDir: string
  staticSpa: boolean
  /** Remote server running this app; null = the aoox host. */
  serverId: string | null
  /** Build and run open pull requests beside the app (opt-in; forks ignored). */
  previewsEnabled: boolean
  /** Base for `<appName>-pr<N>.<domain>`; null = PREVIEW_DOMAIN of the API. */
  previewDomain: string | null
  status: ApplicationStatus
  currentImage: string | null
  createdAt: string
  updatedAt: string
}

export interface ApplicationDetail extends Application {
  container: { id: string; state: string; status: string } | null
  /** The signed-in user's role in the owning project. */
  projectRole: "admin" | "developer" | "viewer"
  /** Swarm service summary (deployMode 'service'). */
  service: {
    serviceId: string
    desired: number
    running: number
    updateState: string | null
    updateMessage: string | null
    tasks: Array<{
      id: string
      slot: number | null
      state: string
      desiredState: string
      containerId: string | null
      nodeId: string | null
      node: string | null
      local: boolean
      error: string | null
      since: string
    }>
  } | null
}

export type DeploymentKind = "build" | "rollback" | "auto-update" | "config"

export interface DeploymentSummary {
  id: string
  applicationId: string
  status: DeploymentStatus
  kind: DeploymentKind
  rolledBackFromId: string | null
  imageRef: string | null
  errorMessage: string | null
  createdAt: string
  finishedAt: string | null
}

export interface Deployment extends DeploymentSummary {
  logs: string
}

/** Mirrors DnsCheckDto in aoox-api. */
export type DnsStatus = "ok" | "mismatch" | "unresolved" | "unknown"

export interface DnsCheck {
  host: string
  status: DnsStatus
  expectedIp: string | null
  expectedSource: "env" | "detected" | "server" | null
  addresses: string[]
  cname: string | null
  message: string
}

export interface Domain {
  id: string
  applicationId: string
  host: string
  https: boolean
  createdAt: string
}

/** Mirrors Mount in aoox-api. `file` mounts are always read-only. */
export type MountType = "volume" | "bind" | "file"

/** Mounts belong to an application, a managed database, or a compose stack (same API shape). */
export type MountOwner =
  | { kind: "application"; id: string }
  | { kind: "database"; id: string }
  | { kind: "compose"; id: string }

const MOUNT_OWNER_PATH: Record<MountOwner["kind"], string> = {
  application: "applications",
  database: "databases",
  compose: "compose-apps",
}

export function mountOwnerBase(owner: MountOwner): string {
  return `/${MOUNT_OWNER_PATH[owner.kind]}/${owner.id}`
}

/**
 * The web app's own detail-page route for a mount owner — same as the API
 * path for application/database, but the compose page lives at `/compose`,
 * not `/compose-apps` (that's the API's route, reused above only because it
 * happens to match for the other two kinds).
 */
export function mountOwnerPagePath(owner: MountOwner): string {
  return owner.kind === "compose"
    ? `/compose/${owner.id}`
    : mountOwnerBase(owner)
}

export interface Mount {
  id: string
  applicationId: string | null
  databaseId: string | null
  composeAppId: string | null
  /** Which service in the stack this mount attaches to (compose only). */
  service: string | null
  type: MountType
  name: string | null
  hostPath: string | null
  content: string | null
  containerPath: string
  readOnly: boolean
  createdAt: string
  updatedAt: string
}

export interface WebhookInfo {
  url: string
  token: string
  branch: string
  /** Shared secret for X-Hub-Signature-256 / X-Gitlab-Token; null = off. */
  secret: string | null
}

/** `POST /applications/:id/check-image` — registry digest vs the deployed one. */
export interface ImageCheckResult {
  remoteDigest: string | null
  previousDigest: string | null
  changed: boolean
  deploymentId: string | null
  baseline: boolean
}
