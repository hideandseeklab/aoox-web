"use server"

import { revalidatePath } from "next/cache"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

function fail(err: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error:
      err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server",
  }
}

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult> {
  try {
    await api<void>("/users/me/password", {
      method: "POST",
      body: { currentPassword, newPassword },
      token: await requireToken(),
    })
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export interface TwoFactorSetup {
  secret: string
  uri: string
  qrDataUrl: string
}

export async function setupTwoFactorAction(): Promise<
  ActionResult<TwoFactorSetup>
> {
  try {
    const data = await api<TwoFactorSetup>("/auth/2fa/setup", {
      method: "POST",
      token: await requireToken(),
    })
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function enableTwoFactorAction(
  code: string
): Promise<ActionResult<string[]>> {
  try {
    const data = await api<{ backupCodes: string[] }>("/auth/2fa/enable", {
      method: "POST",
      body: { code },
      token: await requireToken(),
    })
    revalidatePath("/settings")
    return { ok: true, data: data.backupCodes }
  } catch (err) {
    return fail(err)
  }
}

export async function disableTwoFactorAction(
  password: string
): Promise<ActionResult> {
  try {
    await api<void>("/auth/2fa/disable", {
      method: "POST",
      body: { password },
      token: await requireToken(),
    })
    revalidatePath("/settings")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

/** Owner: set a member's password (handed over out of band). */
export async function setUserPasswordAction(
  userId: string,
  password: string
): Promise<ActionResult> {
  try {
    await api<void>(`/users/${userId}/password`, {
      method: "POST",
      body: { password },
      token: await requireToken(),
    })
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

/** Owner: unlock a member who lost their authenticator. */
export async function disableUserTwoFactorAction(
  userId: string
): Promise<ActionResult> {
  try {
    await api<void>(`/users/${userId}/2fa/disable`, {
      method: "POST",
      token: await requireToken(),
    })
    revalidatePath("/settings")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}
