/** Mirrors `SwarmStatus` / `SwarmNodeInfo` in the API (swarm module). */
export interface SwarmNode {
  id: string
  hostname: string
  role: "manager" | "worker"
  availability: "active" | "pause" | "drain"
  state: string
  addr: string
  leader: boolean
  engineVersion: string
  cpus: number
  memoryBytes: number
  message: string | null
  labels: Record<string, string>
}

export interface SwarmStatus {
  state: "inactive" | "pending" | "active" | "error" | "locked"
  isManager: boolean
  nodeId: string | null
  nodeAddr: string | null
  error: string | null
  nodes: SwarmNode[]
  /** Owner only. */
  joinTokens: { worker: string; manager: string } | null
  serviceApps: number
  /** Built images are pulled from the self-hosted registry; `localhost:` is only reachable on the host. */
  registry: { url: string | null; reachableFromNodes: boolean }
}
