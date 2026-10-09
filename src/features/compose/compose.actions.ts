"use server"

import { getTranslations } from "next-intl/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { WebhookInfo } from "@/features/application/application.entity"
import type {
  ComposeApp,
  ComposeAppDetail,
  ComposeDeployment,
  ComposeDeploymentDetail,
  ComposeMetrics,
  ComposeServiceDomain,
  ComposeServicePort,
  ComposeServiceResources,
} from "./compose.entity"
import {
  createComposeAppSchema,
  createComposeTemplateSchema,
} from "./compose.schema"

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

type Field =
  | "name"
  | "gitUrl"
  | "gitBranch"
  | "composePath"
  | "gitCredentialId"
  | "env"
  | "composeContent"

export interface ComposeFormState {
  error?: string
  fieldErrors?: Partial<Record<Field, string[]>>
  values?: Record<Field, string>
  saved?: boolean
  /** Set on a successful create — the dialog navigates itself instead of a
   * server-side `redirect()`, so its loading toast can be resolved first. */
  createdId?: string
}

function readForm(formData: FormData): Record<Field, string> {
  const get = (k: Field) => String(formData.get(k) ?? "")
  return {
    name: get("name"),
    gitUrl: get("gitUrl"),
    gitBranch: get("gitBranch"),
    composePath: get("composePath"),
    gitCredentialId:
      get("gitCredentialId") === "none" ? "" : get("gitCredentialId"),
    env: get("env"),
    composeContent: get("composeContent"),
  }
}

async function parse(
  values: Record<Field, string>,
  source: "git" | "template"
) {
  const t = await getTranslations("compose")
  const parsed =
    source === "template"
      ? createComposeTemplateSchema(t).safeParse(values)
      : createComposeAppSchema(t).safeParse(values)
  if (parsed.success) return { data: parsed.data, fieldErrors: undefined }
  const fieldErrors: ComposeFormState["fieldErrors"] = {}
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as Field
    ;(fieldErrors[key] ??= []).push(issue.message)
  }
  return { data: undefined, fieldErrors }
}

export async function createComposeAppAction(
  projectId: string,
  _prev: ComposeFormState,
  formData: FormData
): Promise<ComposeFormState> {
  const values = readForm(formData)
  const { data, fieldErrors } = await parse(values, "git")
  if (!data) return { fieldErrors, values }
  let app: ComposeApp
  try {
    app = await api<ComposeApp>("/compose-apps", {
      method: "POST",
      body: { projectId, ...data },
      token: await requireToken(),
    })
  } catch (err) {
    return { ...(await fail(err)), values }
  }
  revalidatePath(`/projects/${projectId}`)
  return { values, createdId: app.id }
}

export async function updateComposeAppAction(
  id: string,
  _prev: ComposeFormState,
  formData: FormData
): Promise<ComposeFormState> {
  const values = readForm(formData)
  const source = formData.get("source") === "template" ? "template" : "git"
  const { data, fieldErrors } = await parse(values, source)
  if (!data) return { fieldErrors, values }
  try {
    await api<ComposeApp>(`/compose-apps/${id}`, {
      method: "PATCH",
      body: data,
      token: await requireToken(),
    })
  } catch (err) {
    return { ...(await fail(err)), values }
  }
  revalidatePath(`/compose/${id}`)
  return { values, saved: true }
}

async function post(id: string, action: string): Promise<ActionResult> {
  try {
    await api<ComposeApp>(`/compose-apps/${id}/${action}`, {
      method: "POST",
      token: await requireToken(),
    })
    revalidatePath(`/compose/${id}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return await fail(err)
  }
}

// Server actions must be `async function`s (Next rejects arrow aliases).
export async function deployComposeAppAction(
  id: string
): Promise<ActionResult> {
  return post(id, "deploy")
}
export async function stopComposeAppAction(id: string): Promise<ActionResult> {
  return post(id, "stop")
}
export async function startComposeAppAction(id: string): Promise<ActionResult> {
  return post(id, "start")
}

export async function deleteComposeAppAction(
  id: string,
  projectId: string
): Promise<ActionResult> {
  try {
    await api<void>(`/compose-apps/${id}`, {
      method: "DELETE",
      token: await requireToken(),
    })
  } catch (err) {
    return await fail(err)
  }
  revalidatePath(`/projects/${projectId}`)
  redirect(`/projects/${projectId}`)
}

/** Polled by the detail page while an action runs. */
export async function fetchComposeAppAction(
  id: string
): Promise<ComposeAppDetail | null> {
  try {
    return await api<ComposeAppDetail>(`/compose-apps/${id}`, {
      token: await requireToken(),
    })
  } catch {
    return null
  }
}

/** Replaces the exposed services (Traefik routing); applied on the next deploy. */
export async function updateServicePortsAction(
  id: string,
  servicePorts: ComposeServicePort[]
): Promise<ActionResult> {
  try {
    await api<ComposeApp>(`/compose-apps/${id}`, {
      method: "PATCH",
      body: { servicePorts },
      token: await requireToken(),
    })
    revalidatePath(`/compose/${id}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return await fail(err)
  }
}

export async function updateServiceDomainsAction(
  id: string,
  serviceDomains: ComposeServiceDomain[]
): Promise<ActionResult> {
  try {
    await api<ComposeApp>(`/compose-apps/${id}`, {
      method: "PATCH",
      body: { serviceDomains },
      token: await requireToken(),
    })
    revalidatePath(`/compose/${id}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return await fail(err)
  }
}

/** Per-service CPU/RAM caps; applies on the stack's next deploy. */
export async function updateServiceResourcesAction(
  id: string,
  serviceResources: ComposeServiceResources[]
): Promise<ActionResult> {
  try {
    await api<ComposeApp>(`/compose-apps/${id}`, {
      method: "PATCH",
      body: { serviceResources },
      token: await requireToken(),
    })
    revalidatePath(`/compose/${id}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return await fail(err)
  }
}

/** Run history, polled while one is still running. */
export async function fetchComposeDeploymentsAction(
  id: string
): Promise<ComposeDeployment[]> {
  try {
    return await api<ComposeDeployment[]>(`/compose-apps/${id}/deployments`, {
      token: await requireToken(),
    })
  } catch {
    return []
  }
}

/** One run with its output (old runs keep their own logs). */
export async function fetchComposeDeploymentAction(
  deploymentId: string
): Promise<ComposeDeploymentDetail | null> {
  try {
    return await api<ComposeDeploymentDetail>(
      `/compose-deployments/${deploymentId}`,
      { token: await requireToken() }
    )
  } catch {
    return null
  }
}

/** Live CPU/RAM per service; null when the sampler has nothing yet. */
export async function fetchComposeMetricsAction(
  id: string
): Promise<ComposeMetrics | null> {
  try {
    return await api<ComposeMetrics>(`/compose-apps/${id}/metrics`, {
      token: await requireToken(),
    })
  } catch {
    return null
  }
}

export async function regenerateComposeWebhookAction(
  id: string
): Promise<ActionResult<WebhookInfo>> {
  try {
    const data = await api<WebhookInfo>(
      `/compose-apps/${id}/webhook/regenerate`,
      { method: "POST", token: await requireToken() }
    )
    revalidatePath(`/compose/${id}`)
    return { ok: true, data }
  } catch (err) {
    return await fail(err)
  }
}

export async function setComposeWebhookSecretAction(
  id: string,
  enabled: boolean
): Promise<ActionResult<WebhookInfo>> {
  try {
    const data = await api<WebhookInfo>(`/compose-apps/${id}/webhook/secret`, {
      method: enabled ? "PUT" : "DELETE",
      token: await requireToken(),
    })
    revalidatePath(`/compose/${id}`)
    return { ok: true, data }
  } catch (err) {
    return await fail(err)
  }
}
