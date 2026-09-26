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

export interface SelfHostedStatus {
  dockerAvailable: boolean
  publicUrl: string
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
