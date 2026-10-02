/** Mirrors the secret-connection DTOs in aoox-api (never carries the client secret). */
export interface SecretConnection {
  id: string
  name: string
  /** Base URL of the secret manager; null/empty = the provider's default (Infisical Cloud). */
  url: string | null
  clientId: string
  createdAt?: string
}

/** What `get-application` returns as `secretSource`, or null when the app has none. */
export interface SecretSource {
  connectionId: string
  connectionName: string
  projectId: string
  environment: string
  path: string
  /** Pass every secret of the path to the container, not only `${{secret.KEY}}` references. */
  sync: boolean
}

export interface SecretSourceInput {
  /** null removes the source. */
  connectionId: string | null
  projectId: string
  environment: string
  path: string
  sync: boolean
}

export interface SecretConnectionTestResult {
  ok: boolean
  message: string
}
