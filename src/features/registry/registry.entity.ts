export type RegistryType = "self-hosted" | "external"

export interface Registry {
  id: string
  name: string
  type: RegistryType
  url: string
  username: string | null
  imagePrefix: string | null
  domain: string | null
  storageDestinationId: string | null
  createdAt: string
}

export interface SelfHostedContainer {
  installed: boolean
  running: boolean
  state: string | null
  containerId: string | null
  image: string | null
}

/** How the Docker container relates to the registry row; mirrors the API's `SelfHostedState`. */
export type SelfHostedState =
  | "docker-unavailable"
  | "not-installed"
  | "installed"
  | "unmanaged-container"
  | "missing-container"

export interface SelfHostedStatus {
  state: SelfHostedState
  dockerAvailable: boolean
  /** Address the server itself uses (image references); `localhost:<port>` by default. */
  publicUrl: string
  /** Interface the host port is published on (`REGISTRY_PUBLISH_ADDRESS`, default 127.0.0.1). */
  publishAddress: string
  /** Only this server can reach the registry (default binding, no domain). */
  localOnly: boolean
  /** Address other machines use for `docker login`/`push`; null when local only or unknown. */
  externalAddress: string | null
  container: SelfHostedContainer
  registry: Registry | null
}

export interface ProvisionResult {
  registry: Registry
  username: string
  password: string
}

export interface RepositorySummary {
  name: string
  tagCount: number
}

export interface Tag {
  name: string
  digest: string
  size: number | null
}

export interface RegistryTestResult {
  ok: boolean
  message: string
}

export interface RepositoryUsage {
  applicationId: string
  applicationName: string
  projectId: string
}

export interface DeleteRepositoryResult {
  deletedTags: number
  deletedManifests: number
  gcOutput: string
}

export interface RegistryCredentials {
  url: string
  username: string | null
  password: string | null
}

export interface ResetPasswordResult {
  username: string
  password: string
}
