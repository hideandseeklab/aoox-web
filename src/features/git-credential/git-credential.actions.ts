"use server"

import { getTranslations } from "next-intl/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { GitCredential } from "./git-credential.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

async function fail(err: unknown): Promise<{ ok: false; error: string }> {
  const t = await getTranslations("settings")
  return {
    ok: false,
    error: err instanceof ApiError ? err.message : t("errors.unreachable"),
  }
}

const schema = (t: (key: string) => string) =>
  z.object({
    name: z.string().trim().min(1, t("validation.nameRequired")).max(100),
    provider: z.enum(["github", "gitlab", "generic"]),
    username: z
      .string()
      .trim()
      .min(1, t("validation.usernameRequired"))
      .max(255),
    token: z.string().min(1, t("validation.tokenRequired")).max(4096),
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
  const t = await getTranslations("settings")
  const parsed = schema(t).safeParse({
    ...values,
    token: formData.get("token"),
  })
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
    return { error: (await fail(err)).error, values }
  }
  revalidatePath("/integrations/git")
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
    revalidatePath("/integrations/git")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}
