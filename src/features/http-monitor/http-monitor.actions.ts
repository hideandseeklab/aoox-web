"use server"

import { getTranslations } from "next-intl/server"
import { revalidatePath } from "next/cache"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { HttpMonitorConfig, HttpMonitorView } from "./http-monitor.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

async function fail(err: unknown): Promise<{ ok: false; error: string }> {
  return {
    ok: false,
    error:
      err instanceof ApiError
        ? err.message
        : (await getTranslations("common"))("messages.serverUnreachable"),
  }
}

export async function saveHttpMonitorAction(
  applicationId: string,
  input: Partial<HttpMonitorConfig>
): Promise<ActionResult<HttpMonitorView>> {
  try {
    const data = await api<HttpMonitorView>(
      `/applications/${applicationId}/monitor`,
      { method: "PUT", body: input, token: await requireToken() }
    )
    revalidatePath(`/applications/${applicationId}`)
    return { ok: true, data }
  } catch (err) {
    return await fail(err)
  }
}

export async function checkHttpMonitorAction(
  applicationId: string
): Promise<ActionResult<HttpMonitorView>> {
  try {
    const data = await api<HttpMonitorView>(
      `/applications/${applicationId}/monitor/check`,
      { method: "POST", token: await requireToken() }
    )
    revalidatePath(`/applications/${applicationId}`)
    return { ok: true, data }
  } catch (err) {
    return await fail(err)
  }
}
