import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { AuditLog } from "./audit-log.entity"

export interface AuditLogFilter {
  limit?: number
  before?: string
  actorId?: string
  action?: string
}

export async function listAuditLogs(
  filter: AuditLogFilter = {}
): Promise<AuditLog[]> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(filter)) {
    if (v !== undefined && v !== "") qs.set(k, String(v))
  }
  const q = qs.toString()
  return api<AuditLog[]>(`/audit-logs${q ? `?${q}` : ""}`, {
    token: await requireToken(),
  })
}
