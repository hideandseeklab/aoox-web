"use server"

import { revalidatePath } from "next/cache"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type {
  PanelDomainSettings,
  UpdatePanelDomainInput,
} from "./panel-domain.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

function fail(err: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error:
      err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server",
  }
}

export async function updatePanelDomainAction(
  input: UpdatePanelDomainInput
): Promise<ActionResult<PanelDomainSettings>> {
  try {
    const data = await api<PanelDomainSettings>("/instance/domain", {
      method: "PATCH",
      body: input,
      token: await requireToken(),
    })
    revalidatePath("/infra/domain")
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}
