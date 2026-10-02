import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { HttpMonitorView } from "./http-monitor.entity"

export async function getHttpMonitor(
  applicationId: string
): Promise<HttpMonitorView> {
  return api<HttpMonitorView>(`/applications/${applicationId}/monitor`, {
    token: await requireToken(),
  })
}
