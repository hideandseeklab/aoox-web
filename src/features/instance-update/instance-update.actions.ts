"use server"

import { revalidatePath } from "next/cache"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type {
  InstanceUpdateProgress,
  InstanceUpdateStatus,
} from "./instance-update.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

function fail(err: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error:
      err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server",
  }
}

/**
 * `applyInstanceUpdateAction`'s own result: while an update is restarting the
 * `api`/`web` containers, a connection failure calling the API is *expected*
 * (see `instance-update-card.tsx`), so this action tells the caller whether a
 * failure was a real rejection (`ApiError` — the request reached the API and
 * it said no, e.g. `INSTALL_DIR` unset) or just "couldn't connect", which the
 * caller treats as "probably fine, keep going" rather than a red error.
 */
export type ApplyUpdateResult =
  | { ok: true }
  | { ok: false; error: string; networkError: boolean }

export async function checkInstanceUpdateAction(): Promise<
  ActionResult<InstanceUpdateStatus>
> {
  try {
    const data = await api<InstanceUpdateStatus>("/instance/update", {
      token: await requireToken(),
    })
    revalidatePath("/infra/update")
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function applyInstanceUpdateAction(): Promise<ApplyUpdateResult> {
  try {
    await api<void>("/instance/update/apply", {
      method: "POST",
      token: await requireToken(),
    })
    revalidatePath("/infra/update")
    return { ok: true }
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, error: err.message, networkError: false }
    }
    return {
      ok: false,
      error: "Tidak dapat terhubung ke server",
      networkError: true,
    }
  }
}

/**
 * Cheap poll target for "is the panel back yet" — no registry calls on the
 * API side. Errors are swallowed into `applying: null` (see the card) rather
 * than surfaced, since a failure here almost always just means the `api`/
 * `web` containers are mid-restart, not a real problem.
 */
export async function pingInstanceUpdateAction(): Promise<
  ActionResult<InstanceUpdateProgress>
> {
  try {
    const data = await api<InstanceUpdateProgress>("/instance/update/progress", {
      token: await requireToken(),
    })
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}
