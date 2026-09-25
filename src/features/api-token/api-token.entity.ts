/** Mirrors ApiToken in aoox-api (never carries the hash). */
export interface ApiToken {
  id: string
  userId: string
  name: string
  prefix: string
  /** Refuses every state-changing request. */
  readOnly: boolean
  /** Projects the token may touch; null = everything its user may see. */
  projectIds: string[] | null
  expiresAt: string | null
  lastUsedAt: string | null
  createdAt: string
}

export interface CreatedApiToken extends ApiToken {
  /** Plaintext, shown once. */
  token: string
}
