"use server"

import { revalidatePath } from "next/cache"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type {
  ProvisionResult,
  Registry,
  RegistryTestResult,
  Tag,
} from "./registry.entity"
import { externalRegistrySchema } from "./registry.schema"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

function fail(err: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error:
      err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server",
  }
}

export async function provisionSelfHostedAction(): Promise<
  ActionResult<ProvisionResult>
> {
  try {
    const data = await api<ProvisionResult>("/registries/self-hosted", {
      method: "POST",
      token: await requireToken(),
    })
    revalidatePath("/registry")
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function removeSelfHostedAction(
  purge: boolean
): Promise<ActionResult> {
  try {
    await api<void>(`/registries/self-hosted?purge=${purge}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath("/registry")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function setRegistryDomainAction(
  registryId: string,
  domain: string | null
): Promise<ActionResult<Registry>> {
  try {
    const data = await api<Registry>(`/registries/${registryId}/domain`, {
      method: "PATCH",
      body: { domain },
      token: await requireToken(),
    })
    revalidatePath("/registry")
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function garbageCollectAction(
  dryRun: boolean
): Promise<ActionResult<{ output: string }>> {
  try {
    const data = await api<{ output: string }>(
      `/registries/self-hosted/garbage-collect?dryRun=${dryRun}`,
      { method: "POST", token: await requireToken() }
    )
    revalidatePath("/registry")
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteTagAction(
  registryId: string,
  repository: string,
  tag: string
): Promise<ActionResult> {
  try {
    await api<void>(
      `/registries/${registryId}/repositories/${repository}/tags/${encodeURIComponent(tag)}`,
      { method: "DELETE", token: await requireToken() }
    )
    revalidatePath("/registry")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function fetchTagsAction(
  registryId: string,
  repository: string
): Promise<ActionResult<Tag[]>> {
  try {
    const data = await api<Tag[]>(
      `/registries/${registryId}/repositories/${repository}/tags`,
      { token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function testRegistryAction(
  registryId: string
): Promise<ActionResult<RegistryTestResult>> {
  try {
    const data = await api<RegistryTestResult>(
      `/registries/${registryId}/test`,
      { method: "POST", token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteRegistryAction(
  registryId: string
): Promise<ActionResult> {
  try {
    await api<void>(`/registries/${registryId}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath("/registry")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export interface ExternalRegistryFormState {
  error?: string
  fieldErrors?: Partial<
    Record<"name" | "url" | "username" | "password" | "imagePrefix", string[]>
  >
  values?: Record<"name" | "url" | "username" | "imagePrefix", string>
  created?: boolean
}

export async function createExternalRegistryAction(
  _prev: ExternalRegistryFormState,
  formData: FormData
): Promise<ExternalRegistryFormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    url: String(formData.get("url") ?? ""),
    username: String(formData.get("username") ?? ""),
    imagePrefix: String(formData.get("imagePrefix") ?? ""),
  }
  const parsed = externalRegistrySchema.safeParse({
    ...values,
    password: String(formData.get("password") ?? ""),
  })
  if (!parsed.success) {
    const fieldErrors: ExternalRegistryFormState["fieldErrors"] = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<typeof fieldErrors>
      ;(fieldErrors[key] ??= []).push(issue.message)
    }
    return { fieldErrors, values }
  }
  try {
    await api<Registry>("/registries", {
      method: "POST",
      body: parsed.data,
      token: await requireToken(),
    })
  } catch (err) {
    return { ...fail(err), values }
  }
  revalidatePath("/registry")
  return { created: true }
}
