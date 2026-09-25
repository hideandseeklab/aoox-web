import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { Notification } from "./notification.entity"

/** Owner/admin only (403 otherwise) — callers gate on canUseTerminal first. */
export async function listNotifications(): Promise<Notification[]> {
  return api<Notification[]>("/notifications", { token: await requireToken() })
}
