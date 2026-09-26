import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { InstanceUpdateStatus } from "./instance-update.entity"

export async function getInstanceUpdateStatus(): Promise<InstanceUpdateStatus> {
  return api<InstanceUpdateStatus>("/instance/update", {
    token: await requireToken(),
  })
}
