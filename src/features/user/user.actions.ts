"use server"

import { getTranslations } from "next-intl/server"
import { revalidatePath } from "next/cache"
import type { AuthUser } from "@/features/auth/auth.entity"
import {
  getSession,
  requireToken,
  setSession,
} from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

async function fail(err: unknown): Promise<{ ok: false; error: string }> {
  const t = await getTranslations("settings")
  return {
    ok: false,
    error: err instanceof ApiError ? err.message : t("errors.unreachable"),
  }
}

/**
 * Own name/email. Changing the email needs the current password. On success
 * the user object in the session cookie is refreshed so everything that reads
 * it before the next `/auth/me` shows the new values.
 */
export async function updateOwnProfileAction(input: {
  name: string
  email: string
  currentPassword?: string
}): Promise<ActionResult<AuthUser>> {
  try {
    const token = await requireToken()
    const updated = await api<AuthUser>("/users/me", {
      method: "PATCH",
      body: {
        name: input.name.trim() || null,
        email: input.email.trim(),
        ...(input.currentPassword
          ? { currentPassword: input.currentPassword }
          : {}),
      },
      token,
    })
    const session = await getSession()
    if (session) {
      await setSession({
        token: session.token,
        user: {
          ...session.user,
          email: updated.email,
          name: updated.name,
        },
      })
    }
    revalidatePath("/settings")
    return { ok: true, data: updated }
  } catch (err) {
    return fail(err)
  }
}

/** Owner: change the name/email of a non-owner user. */
export async function updateUserProfileAction(
  userId: string,
  input: { name: string; email: string }
): Promise<ActionResult> {
  try {
    await api<unknown>(`/users/${userId}`, {
      method: "PATCH",
      body: { name: input.name.trim() || null, email: input.email.trim() },
      token: await requireToken(),
    })
    revalidatePath("/settings")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}
