"use server"

import { getTranslations } from "next-intl/server"
import { revalidatePath } from "next/cache"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import { alertsPath } from "./resource-alert.path"
import type {
  AlertMetric,
  AlertOwnerKind,
  AlertRuleConfig,
  ResourceAlertsView,
} from "./resource-alert.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

export async function saveResourceAlertsAction(
  kind: AlertOwnerKind,
  id: string,
  input: Partial<Record<AlertMetric, Partial<AlertRuleConfig>>>
): Promise<ActionResult<ResourceAlertsView>> {
  try {
    const data = await api<ResourceAlertsView>(alertsPath(kind, id), {
      method: "PUT",
      body: input,
      token: await requireToken(),
    })
    revalidatePath(`/${kind === "application" ? "applications" : "databases"}/${id}`)
    return { ok: true, data }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof ApiError
          ? err.message
          : (await getTranslations("common"))("messages.serverUnreachable"),
    }
  }
}
