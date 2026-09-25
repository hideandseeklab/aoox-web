/** Mirrors src/modules/application/logs.protocol.ts in aoox-api. */

// client -> server
export interface LogsClientEvents {
  "subscribe:deployment": (deploymentId: string) => void
  "subscribe:container": (tail: number) => void
  unsubscribe: () => void
}

// server -> client
export interface LogsServerEvents {
  /** `snapshot: true` carries the full text so far; otherwise `chunk` is appended. */
  "deployment:log": (payload: {
    deploymentId: string
    chunk: string
    snapshot?: boolean
  }) => void
  "deployment:status": (payload: {
    deploymentId: string
    status: string
  }) => void
  "container:log": (chunk: string) => void
  "container:end": () => void
  error: (message: string) => void
}

export interface LogTicket {
  ticket: string
  expiresIn: number
}

export function logsNamespaceUrl(publicApiUrl: string): string {
  return new URL("/logs", publicApiUrl).toString()
}
