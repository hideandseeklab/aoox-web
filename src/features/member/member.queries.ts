import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { Invitation, InvitationPreview, Member } from "./member.entity"

/** Owner/admin only (403 otherwise) — callers gate on canUseTerminal first. */
export async function listMembers(): Promise<Member[]> {
  return api<Member[]>("/users", { token: await requireToken() })
}

export async function listInvitations(): Promise<Invitation[]> {
  return api<Invitation[]>("/invitations", { token: await requireToken() })
}

/** Public; null when the link is unknown, used or expired. */
export async function getInvitationPreview(
  token: string
): Promise<InvitationPreview | null> {
  try {
    return await api<InvitationPreview>(
      `/invitations/by-token/${encodeURIComponent(token)}`
    )
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
      return null
    }
    throw err
  }
}
