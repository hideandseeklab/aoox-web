"use server"

import { getTranslations } from "next-intl/server"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { TerminalAuthorizeResult } from "./terminal.entity"
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

/** Owner only (the API answers 403 otherwise). Writes the platform key to the host user's authorized_keys. */
export async function authorizeTerminalAction(): Promise<
  { ok: true; data: TerminalAuthorizeResult } | { ok: false; error: string }
> {
  try {
    const data = await api<TerminalAuthorizeResult>("/terminal/authorize", {
      method: "POST",
      token: await requireToken(),
    })
    return { ok: true, data }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof ApiError
          ? err.message
          : (await getTranslations("terminal"))("errors.serverUnreachable"),
    }
  }
}
