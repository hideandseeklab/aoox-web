/** Mirrors docker-manager.dto.ts in aoox-api. */

export type ManagedKind =
  | "panel"
  | "application"
  | "database"
  | "compose"
  | "companion"
  | "stack"
  | "proxy"
  | "registry"
  | "build"
  | "job"
  | "backup"
  | "component"
  | "aoox"

export interface ManagedInfo {
  kind: ManagedKind
  /** Resource page this container belongs to, when the labels name it. */
  link: { type: "application" | "database" | "compose"; id: string } | null
}

export interface DockerContainer {
  id: string
  name: string
  image: string
  state: string
  status: string
  createdAt: string | null
  ports: {
    ip: string | null
    privatePort: number
    publicPort: number | null
    type: string
  }[]
  /** Non-null = owned by aoox: shown, never stopped/removed from this page. */
  managed: ManagedInfo | null
}

export interface DockerContainerLogs {
  logs: string
  truncated: boolean
}

export interface DockerImage {
  id: string
  tags: string[]
  size: number
  createdAt: string
  usedBy: number
  usedByNames: string[]
  dangling: boolean
  managed: boolean
  /** Why it cannot be removed here (rollback, registry, preview), or null. */
  protectedReason: string | null
}

export interface DockerVolume {
  name: string
  driver: string
  size: number | null
  createdAt: string | null
  usedByNames: string[]
  managed: boolean
  orphan: boolean
}

export interface DockerNetwork {
  id: string
  name: string
  driver: string
  scope: string
  internal: boolean
  subnet: string | null
  usedByNames: string[]
  builtin: boolean
  managed: boolean
}

/** One published host port (mirrors OpenPortDto in aoox-api). */
export interface OpenPort {
  port: number
  protocol: string
  containerPort: number
  addresses: string[]
  /** public = every interface, loopback = 127.0.0.1 only, address = one other IP. */
  exposure: "public" | "loopback" | "address"
  /** Anything but loopback: ufw does not filter it, the provider firewall must. */
  openToInternet: boolean
  containerId: string
  containerName: string
  image: string
  managed: ManagedInfo | null
}

export const DOCKER_TABS = [
  "containers",
  "images",
  "volumes",
  "networks",
  "ports",
] as const
export type DockerTab = (typeof DOCKER_TABS)[number]

