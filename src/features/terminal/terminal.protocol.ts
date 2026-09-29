/** Mirrors src/modules/terminal/terminal.protocol.ts in aoox-api. */

export interface TerminalSize {
  cols: number
  rows: number
}

// client -> server
export interface TerminalClientEvents {
  input: (data: string) => void
  resize: (size: TerminalSize) => void
}

// server -> client
export interface TerminalServerEvents {
  output: (data: string) => void
  exit: (code: number) => void
  /** `hint` = which settings page fixes a configuration failure of the target. */
  error: (message: string, hint?: TerminalErrorHint) => void
}

export type TerminalErrorHint = "environment" | "servers"

export interface TerminalHandshakeAuth extends TerminalSize {
  ticket: string
}

export interface TerminalTicket {
  ticket: string
  expiresIn: number
}

/** Socket.IO namespace URL for the terminal gateway, from the browser-reachable API URL. */
export function terminalNamespaceUrl(publicApiUrl: string): string {
  return new URL("/terminal", publicApiUrl).toString()
}
