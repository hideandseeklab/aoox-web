"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { ProjectRole } from "./project-member.entity"

export type ActionResult = { ok: true } | { ok: false; error: string }

async function fail(err: unknown): Promise<{ ok: false; error: string }> {
  return {
    ok: false,
    error:
      err instanceof ApiError
        ? err.message
        : (await getTranslations("common"))("messages.serverUnreachable"),
  }
}

export async function addProjectMemberAction(
  projectId: string,
  email: string,
  role: ProjectRole
): Promise<ActionResult> {
  try {
    await api(`/projects/${projectId}/members`, {
      method: "POST",
      body: { email: email.trim(), role },
      token: await requireToken(),
    })
    revalidatePath(`/projects/${projectId}`)
    return { ok: true }
  } catch (err) {
    return await fail(err)
  }
}

export async function updateProjectMemberAction(
  projectId: string,
  userId: string,
  role: ProjectRole
): Promise<ActionResult> {
  try {
    await api(`/projects/${projectId}/members/${userId}`, {
      method: "PATCH",
      body: { role },
      token: await requireToken(),
    })
    revalidatePath(`/projects/${projectId}`)
    return { ok: true }
  } catch (err) {
    return await fail(err)
  }
}

export async function removeProjectMemberAction(
  projectId: string,
  userId: string
): Promise<ActionResult> {
  try {
    await api<void>(`/projects/${projectId}/members/${userId}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath(`/projects/${projectId}`)
    return { ok: true }
  } catch (err) {
    return await fail(err)
  }
}
