"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type {
  SecretConnection,
  SecretConnectionTestResult,
  SecretSource,
  SecretSourceInput,
} from "./secret-connection.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

function fail(err: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error:
      err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server",
  }
}

const schema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100),
  url: z
    .string()
    .trim()
    .max(300)
    .refine(
      (v) => v === "" || /^https?:\/\/.+/i.test(v),
      "URL harus diawali http:// atau https://"
    ),
  clientId: z.string().trim().min(1, "Client ID wajib diisi").max(255),
  clientSecret: z.string().min(1, "Client secret wajib diisi").max(4096),
})

type Field = "name" | "url" | "clientId" | "clientSecret"

export interface SecretConnectionFormState {
  error?: string
  fieldErrors?: Partial<Record<Field, string[]>>
  values?: Record<"name" | "url" | "clientId", string>
  created?: boolean
}

export async function createSecretConnectionAction(
  _prev: SecretConnectionFormState,
  formData: FormData
): Promise<SecretConnectionFormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    url: String(formData.get("url") ?? ""),
    clientId: String(formData.get("clientId") ?? ""),
  }
  const parsed = schema.safeParse({
    ...values,
    clientSecret: formData.get("clientSecret"),
  })
  if (!parsed.success) {
    const fieldErrors: SecretConnectionFormState["fieldErrors"] = {}
    for (const issue of parsed.error.issues) {
      ;(fieldErrors[issue.path[0] as Field] ??= []).push(issue.message)
    }
    return { fieldErrors, values }
  }
  const { url, ...rest } = parsed.data
  try {
    await api<SecretConnection>("/secret-connections", {
      method: "POST",
      // An empty URL means "the provider's default": leave it out.
      body: url ? { ...rest, url } : rest,
      token: await requireToken(),
    })
  } catch (err) {
    return { error: fail(err).error, values }
  }
  revalidatePath("/settings")
  return { created: true }
}

export async function deleteSecretConnectionAction(
  id: string
): Promise<ActionResult> {
  try {
    await api<void>(`/secret-connections/${id}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath("/settings")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function testSecretConnectionAction(
  id: string
): Promise<ActionResult<SecretConnectionTestResult>> {
  try {
    const data = await api<SecretConnectionTestResult>(
      `/secret-connections/${id}/test`,
      { method: "POST", token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

const sourceSchema = z.object({
  connectionId: z.string().uuid().nullable(),
  projectId: z.string().trim().min(1, "Project ID wajib diisi").max(200),
  environment: z.string().trim().min(1, "Environment wajib diisi").max(100),
  path: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .refine((v) => v.startsWith("/"), "Path harus diawali /"),
  sync: z.boolean(),
})

export async function saveSecretSourceAction(
  applicationId: string,
  input: SecretSourceInput
): Promise<ActionResult<SecretSource | null>> {
  // Removing the source needs no project/environment: send them as-is, the API ignores them.
  if (input.connectionId !== null) {
    const parsed = sourceSchema.safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Tidak valid",
      }
    }
  }
  try {
    const data = await api<SecretSource | null>(
      `/applications/${applicationId}/secret-source`,
      { method: "PUT", body: input, token: await requireToken() }
    )
    revalidatePath(`/applications/${applicationId}`)
    return { ok: true, data: data ?? null }
  } catch (err) {
    return fail(err)
  }
}

/** Key names only — the API never returns values. */
export async function previewSecretSourceAction(
  applicationId: string
): Promise<ActionResult<{ keys: string[] }>> {
  try {
    const data = await api<{ keys: string[] }>(
      `/applications/${applicationId}/secret-source/preview`,
      { method: "POST", token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}
