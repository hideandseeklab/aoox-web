"use server"

import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { InboxPage } from "./inbox.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

function fail(err: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error:
      err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server",
  }
}

/** Latest events plus the unread count; polled by the bell in the top bar. */
export async function getInboxAction(
  limit = 15
): Promise<ActionResult<InboxPage>> {
  try {
    const data = await api<InboxPage>(`/inbox?limit=${limit}`, {
      token: await requireToken(),
    })
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function markInboxReadAction(): Promise<ActionResult> {
  try {
    await api("/inbox/read", { method: "POST", token: await requireToken() })
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}
