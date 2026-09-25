"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { GitCredential } from "./git-credential.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

const schema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100),
  provider: z.enum(["github", "gitlab", "generic"]),
  username: z.string().trim().min(1, "Username wajib diisi").max(255),
  token: z.string().min(1, "Token wajib diisi").max(4096),
})

export interface GitCredentialFormState {
  error?: string
  fieldErrors?: Partial<
    Record<"name" | "provider" | "username" | "token", string[]>
  >
  values?: Record<"name" | "provider" | "username", string>
  created?: boolean
}

export async function createGitCredentialAction(
  _prev: GitCredentialFormState,
  formData: FormData
): Promise<GitCredentialFormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    provider: String(formData.get("provider") ?? "github"),
    username: String(formData.get("username") ?? ""),
  }
  const parsed = schema.safeParse({ ...values, token: formData.get("token") })
  if (!parsed.success) {
    const fieldErrors: GitCredentialFormState["fieldErrors"] = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<typeof fieldErrors>
      ;(fieldErrors[key] ??= []).push(issue.message)
    }
    return { fieldErrors, values }
  }
  try {
    await api<GitCredential>("/git-credentials", {
      method: "POST",
      body: parsed.data,
      token: await requireToken(),
    })
  } catch (err) {
    return {
      error:
        err instanceof ApiError
          ? err.message
          : "Tidak dapat terhubung ke server",
      values,
    }
  }
  revalidatePath("/settings")
  return { created: true }
}

export async function deleteGitCredentialAction(
  id: string
): Promise<ActionResult> {
  try {
    await api<void>(`/git-credentials/${id}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath("/settings")
    return { ok: true, data: undefined }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof ApiError
          ? err.message
          : "Tidak dapat terhubung ke server",
    }
  }
}
