"use server"

import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { TerminalTicket } from "./terminal.protocol"

/** Exchanges the httpOnly session for a short-lived WebSocket ticket. The
 *  target (a remote server, or the aoox host when omitted) is bound
 *  into the ticket by the API. */
export async function createTerminalTicket(
  serverId?: string
): Promise<TerminalTicket> {
  return api<TerminalTicket>("/terminal/tickets", {
    method: "POST",
    body: serverId ? { serverId } : {},
    token: await requireToken(),
  })
}
