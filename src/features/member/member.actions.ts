"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import type { SignInResponse, UserRole } from "@/features/auth/auth.entity"
import { requireToken, setSession } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { CreatedInvitation } from "./member.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

function fail(err: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error:
      err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server",
  }
}

const inviteSchema = z.object({
  email: z.string().trim().email("Email tidak valid"),
  role: z.enum(["owner", "admin", "member"]),
})

export interface InviteFormState {
  error?: string
  fieldErrors?: Partial<Record<"email" | "role", string[]>>
  values?: { email: string; role: string }
  /** Set after success; the token is shown once. */
  created?: CreatedInvitation
}

export async function createInvitationAction(
  _prev: InviteFormState,
  formData: FormData
): Promise<InviteFormState> {
  const values = {
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? "member"),
  }
  const parsed = inviteSchema.safeParse(values)
  if (!parsed.success) {
    const fieldErrors: InviteFormState["fieldErrors"] = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as "email" | "role"
      ;(fieldErrors[key] ??= []).push(issue.message)
    }
    return { fieldErrors, values }
  }
  try {
    const created = await api<CreatedInvitation>("/invitations", {
      method: "POST",
      body: parsed.data,
      token: await requireToken(),
    })
    revalidatePath("/settings")
    return { created }
  } catch (err) {
    return { ...fail(err), values }
  }
}

export async function revokeInvitationAction(
  id: string
): Promise<ActionResult> {
  try {
    await api<void>(`/invitations/${id}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath("/settings")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function updateMemberRoleAction(
  id: string,
  role: UserRole
): Promise<ActionResult> {
  try {
    await api(`/users/${id}/role`, {
      method: "PATCH",
      body: { role },
      token: await requireToken(),
    })
    revalidatePath("/settings")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteMemberAction(id: string): Promise<ActionResult> {
  try {
    await api<void>(`/users/${id}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath("/settings")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

const acceptSchema = z.object({
  name: z.string().trim().max(100).optional(),
  password: z.string().min(8, "Minimal 8 karakter").max(128),
})

export interface AcceptInviteState {
  error?: string
  fieldErrors?: Partial<Record<"name" | "password", string[]>>
  values?: { name: string }
}

/** Public: creates the invited account and signs in. */
export async function acceptInvitationAction(
  token: string,
  _prev: AcceptInviteState,
  formData: FormData
): Promise<AcceptInviteState> {
  const values = { name: String(formData.get("name") ?? "") }
  const parsed = acceptSchema.safeParse({
    ...values,
    password: formData.get("password"),
  })
  if (!parsed.success) {
    const fieldErrors: AcceptInviteState["fieldErrors"] = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as "name" | "password"
      ;(fieldErrors[key] ??= []).push(issue.message)
    }
    return { fieldErrors, values }
  }
  try {
    const result = await api<SignInResponse>("/invitations/accept", {
      method: "POST",
      body: { token, ...parsed.data, name: parsed.data.name || undefined },
    })
    await setSession({ token: result.accessToken, user: result.user })
  } catch (err) {
    return { ...fail(err), values }
  }
  redirect("/")
}
