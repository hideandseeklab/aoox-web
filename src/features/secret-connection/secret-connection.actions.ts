"use server"

import { getTranslations } from "next-intl/server"
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

async function fail(err: unknown): Promise<{ ok: false; error: string }> {
  const t = await getTranslations("settings")
  return {
    ok: false,
    error: err instanceof ApiError ? err.message : t("errors.unreachable"),
  }
}

type Translate = (key: string) => string

const schema = (t: Translate) =>
  z.object({
    name: z.string().trim().min(1, t("validation.nameRequired")).max(100),
    url: z
      .string()
      .trim()
      .max(300)
      .refine(
        (v) => v === "" || /^https?:\/\/.+/i.test(v),
        t("validation.urlHttp")
      ),
    clientId: z
      .string()
      .trim()
      .min(1, t("validation.clientIdRequired"))
      .max(255),
    clientSecret: z
      .string()
      .min(1, t("validation.clientSecretRequired"))
      .max(4096),
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
  const t = await getTranslations("settings")
  const parsed = schema(t).safeParse({
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
    return { error: (await fail(err)).error, values }
  }
  revalidatePath("/integrations/secrets")
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
    revalidatePath("/integrations/secrets")
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

const sourceSchema = (t: Translate) =>
  z.object({
    connectionId: z.string().uuid().nullable(),
    projectId: z
      .string()
      .trim()
      .min(1, t("validation.projectIdRequired"))
      .max(200),
    environment: z
      .string()
      .trim()
      .min(1, t("validation.environmentRequired"))
      .max(100),
    path: z
      .string()
      .trim()
      .min(1)
      .max(300)
      .refine((v) => v.startsWith("/"), t("validation.pathSlash")),
    sync: z.boolean(),
  })

export async function saveSecretSourceAction(
  applicationId: string,
  input: SecretSourceInput
): Promise<ActionResult<SecretSource | null>> {
  // Removing the source needs no project/environment: send them as-is, the API ignores them.
  if (input.connectionId !== null) {
    const t = await getTranslations("settings")
    const parsed = sourceSchema(t).safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? t("errors.invalid"),
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
