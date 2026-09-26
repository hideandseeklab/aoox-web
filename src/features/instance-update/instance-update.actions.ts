"use server"

import { revalidatePath } from "next/cache"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { InstanceUpdateStatus } from "./instance-update.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

function fail(err: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error:
      err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server",
  }
}

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

export async function applyInstanceUpdateAction(): Promise<ActionResult> {
  try {
    await api<void>("/instance/update/apply", {
      method: "POST",
      token: await requireToken(),
    })
    revalidatePath("/infra/update")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}
