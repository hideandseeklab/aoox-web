/** Mirrors src/modules/application/console.protocol.ts in aoox-api. */

export interface ConsoleSize {
  cols: number
  rows: number
}

// client -> server
export interface ConsoleClientEvents {
  input: (data: string) => void
  resize: (size: ConsoleSize) => void
}

// server -> client
export interface ConsoleServerEvents {
  output: (data: string) => void
  exit: (code: number) => void
  error: (message: string) => void
}

export interface ConsoleHandshakeAuth extends ConsoleSize {
  ticket: string
}

export interface ConsoleTicket {
  ticket: string
  expiresIn: number
  containerId: string
}

/** Socket.IO namespace URL for the console gateway, from the browser-reachable API URL. */
export function consoleNamespaceUrl(publicApiUrl: string): string {
  return new URL("/console", publicApiUrl).toString()
}
