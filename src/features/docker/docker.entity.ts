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

export const DOCKER_TABS = [
  "containers",
  "images",
  "volumes",
  "networks",
] as const
export type DockerTab = (typeof DOCKER_TABS)[number]

export const MANAGED_LABEL: Record<ManagedKind, string> = {
  panel: "Panel aoox",
  application: "Aplikasi",
  database: "Database",
  compose: "Stack",
  companion: "Admin database",
  stack: "Stack",
  proxy: "Proxy",
  registry: "Registry",
  build: "Build",
  job: "Job",
  backup: "Backup",
  component: "Komponen aoox",
  aoox: "Komponen aoox",
}

/** One-line meaning of a managed badge, for its tooltip. */
export function managedHint(kind: ManagedKind): string {
  const what =
    kind === "panel"
      ? "bagian dari panel aoox (postgres, api, web)"
      : `dikelola aoox (${MANAGED_LABEL[kind].toLowerCase()})`
  return `Container ini ${what}. Tidak bisa dihentikan atau dihapus dari halaman ini; kelola dari halamannya.`
}
