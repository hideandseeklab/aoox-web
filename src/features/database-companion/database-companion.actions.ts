"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type {
  CompanionCredentials,
  DatabaseCompanion,
} from "./database-companion.entity"
import { createCompanionSchema, type CompanionInput } from "./database-companion.schema"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

async function fail(err: unknown): Promise<{ ok: false; error: string }> {
  const t = await getTranslations("common")
  return {
    ok: false,
    error:
      err instanceof ApiError ? err.message : t("messages.serverUnreachable"),
  }
}

export async function installCompanionAction(
  databaseId: string,
  input: CompanionInput
): Promise<ActionResult<DatabaseCompanion>> {
  const t = await getTranslations("database")
  const parsed = createCompanionSchema(t).safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? t("companion.validation.invalidInput"),
    }
  }
  const v = parsed.data
  const body =
    v.access === "domain"
      ? { tool: v.tool, host: v.host.toLowerCase(), https: v.https }
      : { tool: v.tool, hostPort: Number(v.hostPort) }
  try {
    const data = await api<DatabaseCompanion>(
      `/databases/${databaseId}/companion`,
      { method: "POST", body, token: await requireToken() }
    )
    revalidatePath(`/databases/${databaseId}`)
    return { ok: true, data }
  } catch (err) {
    return await fail(err)
  }
}

export async function getCompanionCredentialsAction(
  databaseId: string
): Promise<ActionResult<CompanionCredentials>> {
  try {
    const data = await api<CompanionCredentials>(
      `/databases/${databaseId}/companion/credentials`,
      { token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return await fail(err)
  }
}

export async function deleteCompanionAction(
  databaseId: string
): Promise<ActionResult> {
  try {
    await api(`/databases/${databaseId}/companion`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath(`/databases/${databaseId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return await fail(err)
  }
}
