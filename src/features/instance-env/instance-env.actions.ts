"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { UpdateInstanceEnvInput } from "./instance-env.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

async function fail(err: unknown): Promise<{ ok: false; error: string }> {
  const t = await getTranslations("infra.errors")
  return {
    ok: false,
    error: err instanceof ApiError ? err.message : t("serverUnreachable"),
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
