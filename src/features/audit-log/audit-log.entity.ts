/** Mirrors AuditLog in aoox-api. */
export interface AuditLog {
  id: string
  actorId: string | null
  actorEmail: string | null
  via: "session" | "token" | "webhook" | "anonymous" | string
  tokenId: string | null
  action: string
  method: string
  path: string
  params: Record<string, string>
  body: Record<string, unknown> | null
  status: number
  ip: string | null
  createdAt: string
}
