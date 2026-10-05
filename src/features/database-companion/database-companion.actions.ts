"use server"

import { revalidatePath } from "next/cache"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type {
  CompanionCredentials,
  DatabaseCompanion,
} from "./database-companion.entity"
import { companionSchema, type CompanionInput } from "./database-companion.schema"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

function fail(err: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error:
      err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server",
  }
}

export async function installCompanionAction(
  databaseId: string,
  input: CompanionInput
): Promise<ActionResult<DatabaseCompanion>> {
  const parsed = companionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" }
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
    return fail(err)
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
    return fail(err)
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
    return fail(err)
  }
}
