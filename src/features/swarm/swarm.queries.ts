import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { SwarmStatus } from "./swarm.entity"

export async function getSwarmStatus(): Promise<SwarmStatus> {
  return api<SwarmStatus>("/swarm", { token: await requireToken() })
}
