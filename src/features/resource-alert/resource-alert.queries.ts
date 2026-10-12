import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import { alertsPath } from "./resource-alert.path"
import type { AlertOwnerKind, ResourceAlertsView } from "./resource-alert.entity"

export async function getResourceAlerts(
  kind: AlertOwnerKind,
  id: string
): Promise<ResourceAlertsView> {
  return api<ResourceAlertsView>(alertsPath(kind, id), {
    token: await requireToken(),
  })
}
