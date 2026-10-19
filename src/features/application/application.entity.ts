import type { LinkView } from "@/features/variable-set/variable-set.entity"
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
  /** Monorepo subfolder that is built; null = repository root. */
  rootDirectory: string | null
  /** Webhook deploys only when a changed file is under `rootDirectory`. */
  watchRootOnly: boolean
  gitCredentialId: string | null
  containerPort: number
  hostPort: number | null
  /** Interface the host port listens on: public (all) or loopback (this server only). */
  hostPortBind: "public" | "loopback"
  /** HTTP path probed in the container; enables health-gated (blue/green) deploys. */
  healthcheckPath: string | null
  /** Skip this app in the app-error-watcher's container-log scan (for apps whose normal output looks like errors). */
  ignoreErrorLogs: boolean
  backupCron: string | null
  backupKeep: number
  backupDestinationId: string | null
  /** CPU limit in millicores (1000 = one core); null = unlimited. */
  cpuMillicores: number | null
  /** Memory limit in MiB; null = unlimited. */
  memoryMb: number | null
  deploymentKeep: number
  env: string
  /** Linked variable set environments, in merge order (later wins). */
  variableSets?: LinkView[]
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
  /** One wildcard DNS-01 certificate for all previews. */
  previewWildcardCert?: boolean
  /** Maintenance mode: every domain shows a 503 page instead (routing only). */
  maintenanceEnabled: boolean
  /** Text of the maintenance page; null = the default message. */
  maintenanceMessage: string | null
  status: ApplicationStatus
  currentImage: string | null
  createdAt: string
  updatedAt: string
}

export interface ApplicationDetail extends Application {
  /**
   * TCP ports the running image declares with EXPOSE; null when unknown
   * (never deployed, image gone from the daemon, daemon unreachable); [] = none.
   */
  exposedPorts?: number[] | null
  /** Where secrets come from (secret manager), or null/absent when the app has none. */
  secretSource?:
    | import("@/features/secret-connection/secret-connection.entity").SecretSource
    | null
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

/** ISO start of each timed step (`building` also covers pulling an image). */
export type DeploymentStepTimes = Partial<
  Record<"building" | "pushing" | "starting", string>
>

export type DeploymentKind = "build" | "rollback" | "auto-update" | "config"

/** Who/what queued the deployment — separate from `kind` (the build/rollback/config code path). */
export type DeploymentTrigger = "manual" | "webhook" | "auto-update"

export interface DeploymentSummary {
  id: string
  applicationId: string
  status: DeploymentStatus
  kind: DeploymentKind
  rolledBackFromId: string | null
  imageRef: string | null
  errorMessage: string | null
  trigger: DeploymentTrigger
  /** From the webhook's push payload; null for manual/rollback/config/auto-update. */
  commitSha: string | null
  commitMessage: string | null
  /** Actor's email for manual/rollback/config, or the webhook's pusher name. */
  triggeredBy: string | null
  createdAt: string
  finishedAt: string | null
  /** When each step started; null on deployments from before this was recorded. */
  stepTimes: DeploymentStepTimes | null
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

/** A middleware a domain can use: `name@file` and the config file that declares it. */
export interface DomainMiddlewareOption {
  ref: string
  file: string
}

/** Another container already routing a host (never blocks anything). */
export interface DomainConflict {
  containerName: string
  containerId: string
  /** Left over from a deleted project/app; removable on the Docker page. */
  orphan: boolean
}

export interface Domain {
  id: string
  applicationId: string
  host: string
  https: boolean
  /** Custom SSL certificate in use; null = automatic Let's Encrypt. */
  certificateId?: string | null
  certificateName?: string | null
  /** Traefik middlewares (`name@file`) in front of this host, in the order they run. */
  middlewares?: string[]
  /** ACME mode of an https host without an uploaded certificate. */
  certMode?: "http" | "dns" | "dns-wildcard"
  /** DNS connection managing the record of this host. */
  dnsConnectionId?: string | null
  dnsConnectionName?: string | null
  dnsProxied?: boolean
  dnsStatus?: "ok" | "warning" | "error" | null
  dnsMessage?: string | null
  /** Set by add-domain when the record could not be created as asked (the domain was added anyway). */
  dnsWarning?: string | null
  /** Other containers on the daemon that already route this host. */
  conflicts?: DomainConflict[]
  createdAt: string
  /**
   * True when the proxy wasn't running and the API started it automatically
   * for this domain (mirrors `panel-domain`'s flag). Not present on every API
   * version — treat as absent/undefined until the add-domain endpoint is
   * confirmed to return it.
   */
  proxyAutoProvisioned?: boolean
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
  /** True when the API left a file's body out because the caller is a project viewer. */
  contentHidden?: boolean
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
