import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { PanelDomainStatus } from "./panel-domain.entity"

export async function getPanelDomainStatus(): Promise<PanelDomainStatus> {
  return api<PanelDomainStatus>("/instance/domain", {
    token: await requireToken(),
  })
}
