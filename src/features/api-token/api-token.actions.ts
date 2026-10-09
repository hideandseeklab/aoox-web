"use server"

import { getTranslations } from "next-intl/server"
import { revalidatePath } from "next/cache"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { CreatedApiToken } from "./api-token.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

async function fail(err: unknown): Promise<{ ok: false; error: string }> {
  const t = await getTranslations("settings")
  return {
    ok: false,
    error: err instanceof ApiError ? err.message : t("errors.unreachable"),
  }
}

export async function createApiTokenAction(
  name: string,
  expiresInDays: number | null,
  scope: { readOnly?: boolean; projectIds?: string[] } = {}
): Promise<ActionResult<CreatedApiToken>> {
  try {
    const data = await api<CreatedApiToken>("/api-tokens", {
      method: "POST",
      body: {
        name,
        ...(expiresInDays ? { expiresInDays } : {}),
        ...(scope.readOnly ? { readOnly: true } : {}),
        ...(scope.projectIds?.length ? { projectIds: scope.projectIds } : {}),
      },
      token: await requireToken(),
    })
    revalidatePath("/settings")
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteApiTokenAction(id: string): Promise<ActionResult> {
  try {
    await api<void>(`/api-tokens/${id}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath("/settings")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}
