import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { TerminalStatus } from "./terminal.entity"

/** Owner/admin only (403 otherwise) — callers gate on canUseTerminal first. */
export async function getTerminalStatus(): Promise<TerminalStatus> {
  return api<TerminalStatus>("/terminal/status", {
    token: await requireToken(),
  })
}
