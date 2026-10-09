"use server"

import { revalidatePath } from "next/cache"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"

export type ActionResult =
  { ok: true } | { ok: false; error: string }

/** "Sembunyikan": persisted per user by the API (audit-logged), and the dashboard re-renders without it. */
export async function dismissOnboardingAction(): Promise<ActionResult> {
  try {
    await api("/onboarding/dismiss", {
      method: "POST",
      token: await requireToken(),
    })
    revalidatePath("/")
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof ApiError
          ? err.message
          : "Tidak dapat terhubung ke server",
    }
  }
}
