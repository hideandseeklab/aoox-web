/** Mirrors TerminalStatus in aoox-api (terminal-backend.service.ts). */
export type TerminalMode = "ssh" | "local"
export type TerminalKeySource = "env-key" | "env-password" | "generated"

export interface TerminalStatus {
  mode: TerminalMode
  host: string | null
  port: number | null
  /** Effective login (the env value, or the default when unset). */
  username: string | null
  /** `default` = TERMINAL_SSH_USER is empty and the built-in login is used; null in local mode. */
  usernameSource: "env" | "default" | null
  keySource: TerminalKeySource | null
  /** authorized_keys line to install on the host (null for local / password). */
  publicKey: string | null
  /** One-liner the user runs on the host, once, to allow the key. */
  authorizeCommand: string | null
  /** Why the credential could not be prepared (e.g. key dir not writable). */
  error: string | null
}
