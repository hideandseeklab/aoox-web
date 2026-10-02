"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type {
  ImageCheckResult,
  Application,
  DeploymentSummary,
  DnsCheck,
  Domain,
  Mount,
  MountOwner,
  MountType,
  WebhookInfo,
} from "./application.entity"
import { mountOwnerBase, mountOwnerPagePath } from "./application.entity"
import { listPreviews } from "./application.queries"
import { applicationSchema } from "./application.schema"
import type { PreviewDeployment } from "./preview.entity"
import type { LogTicket } from "./logs.protocol"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

function fail(err: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error:
      err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server",
  }
}

type Field =
  | "name"
  | "gitUrl"
  | "gitBranch"
  | "dockerfilePath"
  | "rootDirectory"
  | "watchRootOnly"
  | "gitCredentialId"
  | "containerPort"
  | "hostPort"
  | "healthcheckPath"
  | "cpuMillicores"
  | "memoryMb"
  | "deploymentKeep"
  | "env"
  | "buildArgs"
  | "buildType"
  | "sourceType"
  | "imageRef"
  | "imageRegistryId"
  | "autoUpdate"
  | "autoUpdateIntervalMinutes"
  | "deployMode"
  | "replicas"
  | "swarmNodeId"
  | "swarmConstraint"
  | "updateParallelism"
  | "updateDelaySeconds"
  | "updateOrder"
  | "staticBuildCommand"
  | "staticOutputDir"
  | "staticSpa"
  | "serverId"
  | "previewsEnabled"
  | "previewDomain"
  | "ignoreErrorLogs"

export interface ApplicationFormState {
  error?: string
  fieldErrors?: Partial<Record<Field, string[]>>
  values?: Record<Field, string>
  saved?: boolean
  /** Set on a successful create — the caller navigates itself instead of a
   * server-side `redirect()`, so a toast tracking the submission can be
   * updated to success/error before/around the navigation. */
  createdId?: string
}

function readForm(formData: FormData): Record<Field, string> {
  const get = (k: Field) => String(formData.get(k) ?? "")
  return {
    name: get("name"),
    gitUrl: get("gitUrl"),
    gitBranch: get("gitBranch"),
    dockerfilePath: get("dockerfilePath"),
    rootDirectory: get("rootDirectory"),
    watchRootOnly: formData.get("watchRootOnly") === "on" ? "on" : "",
    gitCredentialId:
      get("gitCredentialId") === "none" ? "" : get("gitCredentialId"),
    containerPort: get("containerPort"),
    hostPort: get("hostPort"),
    healthcheckPath: get("healthcheckPath"),
    cpuMillicores: get("cpuMillicores"),
    memoryMb: get("memoryMb"),
    deploymentKeep: get("deploymentKeep") || "10",
    env: get("env"),
    buildArgs: get("buildArgs"),
    buildType: get("buildType") || "dockerfile",
    sourceType: get("sourceType") || "git",
    imageRef: get("imageRef"),
    imageRegistryId:
      get("imageRegistryId") === "public" ? "" : get("imageRegistryId"),
    autoUpdate: formData.get("autoUpdate") === "on" ? "on" : "",
    autoUpdateIntervalMinutes: get("autoUpdateIntervalMinutes") || "60",
    deployMode: get("deployMode") || "container",
    replicas: get("replicas") || "1",
    swarmNodeId: get("swarmNodeId") === "any" ? "" : get("swarmNodeId"),
    swarmConstraint: get("swarmConstraint"),
    updateParallelism: get("updateParallelism") || "1",
    updateDelaySeconds: get("updateDelaySeconds") || "2",
    updateOrder: get("updateOrder") || "auto",
    staticBuildCommand: get("staticBuildCommand"),
    staticOutputDir: get("staticOutputDir"),
    staticSpa: get("staticSpa") === "on" ? "on" : "",
    serverId: get("serverId") === "local" ? "" : get("serverId"),
    previewsEnabled: formData.get("previewsEnabled") === "on" ? "on" : "",
    previewDomain: get("previewDomain"),
    ignoreErrorLogs: formData.get("ignoreErrorLogs") === "on" ? "on" : "",
  }
}

/**
 * `ignoreErrorLogs` is edit-only (CreateApplicationDto doesn't declare it,
 * and the API's `forbidNonWhitelisted` ValidationPipe 400s on unknown
 * properties) — the parsed schema always includes it (`.default(false)`)
 * since the same schema backs both create and edit.
 */
function omitIgnoreErrorLogs<T extends { ignoreErrorLogs: boolean }>(
  data: T
): Omit<T, "ignoreErrorLogs"> {
  const rest: Record<string, unknown> = { ...data }
  delete rest.ignoreErrorLogs
  return rest as Omit<T, "ignoreErrorLogs">
}

function parse(values: Record<Field, string>) {
  const parsed = applicationSchema.safeParse({
    ...values,
    previewsEnabled: values.previewsEnabled === "on",
    staticSpa: values.staticSpa === "on",
    watchRootOnly: values.watchRootOnly === "on",
    autoUpdate: values.autoUpdate === "on",
    ignoreErrorLogs: values.ignoreErrorLogs === "on",
  })
  if (parsed.success) return { data: parsed.data, fieldErrors: undefined }
  const fieldErrors: ApplicationFormState["fieldErrors"] = {}
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as Field
    ;(fieldErrors[key] ??= []).push(issue.message)
  }
  return { data: undefined, fieldErrors }
}

export async function createApplicationAction(
  projectId: string,
  _prev: ApplicationFormState,
  formData: FormData
): Promise<ApplicationFormState> {
  const values = readForm(formData)
  const { data, fieldErrors } = parse(values)
  if (!data) return { fieldErrors, values }

  let app: Application
  try {
    app = await api<Application>("/applications", {
      method: "POST",
      body: { projectId, ...omitIgnoreErrorLogs(data) },
      token: await requireToken(),
    })
  } catch (err) {
    return { ...fail(err), values }
  }
  revalidatePath(`/projects/${projectId}`)
  return { values, createdId: app.id }
}

/**
 * Same as `createApplicationAction` but returns the created app instead of
 * redirecting — used by the create dialog's "Domain" access option, which
 * needs to call `addDomainAction` right after creation and only then
 * navigate (a `redirect()` inside the action would abort before that call).
 */
export async function createApplicationForAccessAction(
  projectId: string,
  formData: FormData
): Promise<ActionResult<Application>> {
  const values = readForm(formData)
  const { data, fieldErrors } = parse(values)
  if (!data) {
    const message =
      Object.values(fieldErrors ?? {})
        .flat()
        .join("; ") || "Data tidak valid"
    return { ok: false, error: message }
  }
  try {
    const app = await api<Application>("/applications", {
      method: "POST",
      body: { projectId, ...omitIgnoreErrorLogs(data) },
      token: await requireToken(),
    })
    revalidatePath(`/projects/${projectId}`)
    return { ok: true, data: app }
  } catch (err) {
    return fail(err)
  }
}

export async function updateApplicationAction(
  id: string,
  _prev: ApplicationFormState,
  formData: FormData
): Promise<ApplicationFormState> {
  const values = readForm(formData)
  const { data, fieldErrors } = parse(values)
  if (!data) return { fieldErrors, values }
  // The Settings form has no env field any more (it lives in the Environment
  // tab); its absent FormData entry reads as "" and would wipe the stored env.
  const { env: _env, ...settings } = data
  void _env
  try {
    await api<Application>(`/applications/${id}`, {
      method: "PATCH",
      body: settings,
      token: await requireToken(),
    })
  } catch (err) {
    return { ...fail(err), values }
  }
  revalidatePath(`/applications/${id}`)
  return { values, saved: true }
}

/** Saves only the environment (PATCH with `{ env }`), from the Environment tab. */
export async function updateApplicationEnvAction(
  id: string,
  env: string
): Promise<ActionResult> {
  if (env.length > 20_000) {
    return {
      ok: false,
      error: "Environment terlalu panjang (maks 20.000 karakter)",
    }
  }
  try {
    await api<Application>(`/applications/${id}`, {
      method: "PATCH",
      body: { env },
      token: await requireToken(),
    })
    revalidatePath(`/applications/${id}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function deployApplicationAction(
  id: string
): Promise<ActionResult<DeploymentSummary>> {
  try {
    const data = await api<DeploymentSummary>(`/applications/${id}/deploy`, {
      method: "POST",
      token: await requireToken(),
    })
    revalidatePath(`/applications/${id}`)
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

/** Asks the registry for the tag's digest; `deploy` queues a deployment when it changed. */
export async function checkImageUpdateAction(
  id: string,
  deploy: boolean
): Promise<ActionResult<ImageCheckResult>> {
  try {
    const data = await api<ImageCheckResult>(
      `/applications/${id}/check-image`,
      { method: "POST", body: { deploy }, token: await requireToken() }
    )
    revalidatePath(`/applications/${id}`)
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function rollbackApplicationAction(
  id: string,
  deploymentId: string
): Promise<ActionResult<DeploymentSummary>> {
  try {
    const data = await api<DeploymentSummary>(`/applications/${id}/rollback`, {
      method: "POST",
      body: { deploymentId },
      token: await requireToken(),
    })
    revalidatePath(`/applications/${id}`)
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function stopApplicationAction(id: string): Promise<ActionResult> {
  try {
    await api<Application>(`/applications/${id}/stop`, {
      method: "POST",
      token: await requireToken(),
    })
    revalidatePath(`/applications/${id}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function startApplicationAction(
  id: string
): Promise<ActionResult> {
  try {
    await api<Application>(`/applications/${id}/start`, {
      method: "POST",
      token: await requireToken(),
    })
    revalidatePath(`/applications/${id}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteApplicationAction(
  id: string,
  projectId: string
): Promise<void> {
  await api<void>(`/applications/${id}`, {
    method: "DELETE",
    token: await requireToken(),
  })
  revalidatePath(`/projects/${projectId}`)
  redirect(`/projects/${projectId}`)
}

export async function fetchContainerLogsAction(
  id: string,
  tail = 200
): Promise<ActionResult<string>> {
  try {
    const data = await api<{ logs: string }>(
      `/applications/${id}/logs?tail=${tail}`,
      { token: await requireToken() }
    )
    return { ok: true, data: data.logs }
  } catch (err) {
    return fail(err)
  }
}

export async function addDomainAction(
  applicationId: string,
  host: string,
  https: boolean
): Promise<ActionResult<Domain>> {
  try {
    // The API returns `{ domain, proxyAutoProvisioned }`, not a bare Domain —
    // flattened here so `Domain.proxyAutoProvisioned` stays the one place
    // callers read it from, matching how `proxyAutoProvisioned` is already
    // modeled on the type.
    const { domain, proxyAutoProvisioned } = await api<{
      domain: Domain
      proxyAutoProvisioned: boolean
    }>(`/applications/${applicationId}/domains`, {
      method: "POST",
      body: { host: host.trim().toLowerCase(), https },
      token: await requireToken(),
    })
    revalidatePath(`/applications/${applicationId}`)
    return { ok: true, data: { ...domain, proxyAutoProvisioned } }
  } catch (err) {
    return fail(err)
  }
}

/** On-demand DNS check: does the host resolve to where the proxy listens? */
export async function checkDomainDnsAction(
  applicationId: string,
  domainId: string
): Promise<ActionResult<DnsCheck>> {
  try {
    const data = await api<DnsCheck>(
      `/applications/${applicationId}/domains/${domainId}/dns`,
      { token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteDomainAction(
  applicationId: string,
  domainId: string
): Promise<ActionResult> {
  try {
    await api<void>(`/applications/${applicationId}/domains/${domainId}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath(`/applications/${applicationId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

/** Exchanges the session for a short-lived ticket for the /logs socket. */
export async function createLogTicketAction(
  applicationId: string
): Promise<ActionResult<LogTicket>> {
  try {
    const data = await api<LogTicket>(
      `/applications/${applicationId}/log-ticket`,
      {
        method: "POST",
        token: await requireToken(),
      }
    )
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function regenerateWebhookAction(
  applicationId: string
): Promise<ActionResult<WebhookInfo>> {
  try {
    const data = await api<WebhookInfo>(
      `/applications/${applicationId}/webhook/regenerate`,
      { method: "POST", token: await requireToken() }
    )
    revalidatePath(`/applications/${applicationId}`)
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

/** PUT generates/rotates the webhook secret, DELETE turns signature checks off. */
export async function setWebhookSecretAction(
  applicationId: string,
  enabled: boolean
): Promise<ActionResult<WebhookInfo>> {
  try {
    const data = await api<WebhookInfo>(
      `/applications/${applicationId}/webhook/secret`,
      { method: enabled ? "PUT" : "DELETE", token: await requireToken() }
    )
    revalidatePath(`/applications/${applicationId}`)
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

/** Polled by the previews panel while a preview is building. */
export async function fetchPreviewsAction(
  applicationId: string
): Promise<PreviewDeployment[]> {
  try {
    return await listPreviews(applicationId)
  } catch {
    return []
  }
}

export async function deletePreviewAction(
  id: string,
  applicationId: string
): Promise<ActionResult> {
  try {
    await api<void>(`/previews/${id}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath(`/applications/${applicationId}`)
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

export interface MountInput {
  type: MountType
  name?: string
  hostPath?: string
  content?: string
  containerPath: string
  readOnly?: boolean
  /** Compose stacks only: which service in the stack this attaches to. */
  service?: string
}

/** Mount changes re-create the container on the API side (no rebuild). */
export async function addMountAction(
  owner: MountOwner,
  input: MountInput
): Promise<ActionResult<Mount>> {
  try {
    const data = await api<Mount>(`${mountOwnerBase(owner)}/mounts`, {
      method: "POST",
      body: input,
      token: await requireToken(),
    })
    revalidatePath(mountOwnerPagePath(owner))
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function updateMountAction(
  owner: MountOwner,
  mountId: string,
  input: Partial<Omit<MountInput, "type" | "name" | "service">>
): Promise<ActionResult<Mount>> {
  try {
    const data = await api<Mount>(
      `${mountOwnerBase(owner)}/mounts/${mountId}`,
      { method: "PATCH", body: input, token: await requireToken() }
    )
    revalidatePath(mountOwnerPagePath(owner))
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteMountAction(
  owner: MountOwner,
  mountId: string,
  purge: boolean
): Promise<ActionResult> {
  try {
    await api<void>(
      `${mountOwnerBase(owner)}/mounts/${mountId}${purge ? "?purge=true" : ""}`,
      { method: "DELETE", token: await requireToken() }
    )
    revalidatePath(mountOwnerPagePath(owner))
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}
