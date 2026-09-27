import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { InstanceEnvStatus } from "./instance-env.entity"

export async function getInstanceEnvStatus(): Promise<InstanceEnvStatus> {
  return api<InstanceEnvStatus>("/instance/env", {
    token: await requireToken(),
  })
}
