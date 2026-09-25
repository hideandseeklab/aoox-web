"use server"

import { revalidatePath } from "next/cache"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { ProxyStatus } from "./proxy.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

function fail(err: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error:
      err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server",
  }
}

export async function provisionProxyAction(): Promise<
  ActionResult<ProxyStatus>
> {
  try {
    const data = await api<ProxyStatus>("/proxy", {
      method: "POST",
      token: await requireToken(),
    })
    revalidatePath("/settings")
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function removeProxyAction(purge: boolean): Promise<ActionResult> {
  try {
    await api<void>(`/proxy?purge=${purge}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath("/settings")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}
