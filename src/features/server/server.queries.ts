import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { PlatformSshKey, Server } from "./server.entity"

/** Owner/admin only (403 otherwise) — callers gate on canUseTerminal first. */
export async function listServers(): Promise<Server[]> {
  return api<Server[]>("/servers", { token: await requireToken() })
}

export async function getPlatformSshKey(): Promise<PlatformSshKey> {
  return api<PlatformSshKey>("/servers/ssh-key", {
    token: await requireToken(),
  })
}
