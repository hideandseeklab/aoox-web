"use server"

import { revalidatePath } from "next/cache"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { UpdateInstanceEnvInput } from "./instance-env.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

function fail(err: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error:
      err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server",
  }
}

export async function updateInstanceEnvAction(
  input: UpdateInstanceEnvInput
): Promise<ActionResult> {
  try {
    await api<void>("/instance/env", {
      method: "PATCH",
      body: input,
      token: await requireToken(),
    })
    revalidatePath("/infra/environment")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}
