"use server"

import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { ConsoleTicket } from "./console.protocol"

/** Exchanges the httpOnly session for a short-lived console WebSocket ticket,
 *  bound to one application and (for a swarm service with more than one
 *  running task) one specific task container the API resolves and validates. */
export async function createConsoleTicket(
  applicationId: string,
  containerId?: string
): Promise<ConsoleTicket> {
  return api<ConsoleTicket>(`/applications/${applicationId}/console-ticket`, {
    method: "POST",
    body: containerId ? { containerId } : {},
    token: await requireToken(),
  })
}
