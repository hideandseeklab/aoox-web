"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type {
  EnvironmentDiff,
  EnvironmentVersion,
  ProjectEnvironment,
} from "./project-environment.entity"

export type EnvironmentResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

async function fail(err: unknown): Promise<{ ok: false; error: string }> {
  return {
    ok: false,
    error:
      err instanceof ApiError
        ? err.message
        : (await getTranslations("common"))("messages.serverUnreachable"),
  }
}

/**
 * Reads the values of one environment. A POST on purpose (the API records it
 * in the audit log and refuses viewers and, for protected environments,
 * non-admins); never call it from a server component.
 */
export async function revealEnvironmentAction(
  projectId: string,
  envId: string
): Promise<
  EnvironmentResult<{
    variables: string
    updatedAt?: string
    secretKeys: string[]
    plainKeys: string[]
  }>
> {
  try {
    const data = await api<{
      variables: string
      updatedAt?: string
      secretKeys?: string[]
      plainKeys?: string[]
    }>(`/projects/${projectId}/environments/${envId}/reveal`, {
      method: "POST",
      token: await requireToken(),
    })
    return {
      ok: true,
      data: {
        variables: data.variables,
        updatedAt: data.updatedAt,
        secretKeys: data.secretKeys ?? [],
        plainKeys: data.plainKeys ?? [],
      },
    }
  } catch (err) {
    return await fail(err)
  }
}

export async function updateEnvironmentAction(
  projectId: string,
  envId: string,
  variables: string,
  /** `updatedAt` from the reveal being edited; a newer save by someone else is a 409. */
  expectedUpdatedAt?: string,
  /** Secret flags the user changed: name to true/false. Others keep their flag. */
  flags?: Record<string, boolean>
): Promise<EnvironmentResult> {
  if (variables.length > 20_000) {
    const t = await getTranslations("projects")
    return { ok: false, error: t("environments.tooLong") }
  }
  try {
    await api(`/projects/${projectId}/environments/${envId}`, {
      method: "PUT",
      body: {
        variables,
        ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}),
        ...(flags && Object.keys(flags).length > 0 ? { flags } : {}),
      },
      token: await requireToken(),
    })
    revalidatePath(`/projects/${projectId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return await fail(err)
  }
}

export async function createEnvironmentAction(
  projectId: string,
  name: string
): Promise<EnvironmentResult<{ id: string }>> {
  try {
    const env = await api<ProjectEnvironment>(
      `/projects/${projectId}/environments`,
      { method: "POST", body: { name }, token: await requireToken() }
    )
    revalidatePath(`/projects/${projectId}`)
    return { ok: true, data: { id: env.id } }
  } catch (err) {
    return await fail(err)
  }
}

export async function deleteEnvironmentAction(
  projectId: string,
  envId: string
): Promise<EnvironmentResult> {
  try {
    await api<void>(`/projects/${projectId}/environments/${envId}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath(`/projects/${projectId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return await fail(err)
  }
}

export async function listEnvironmentVersionsAction(
  projectId: string,
  envId: string
): Promise<EnvironmentResult<EnvironmentVersion[]>> {
  try {
    const data = await api<EnvironmentVersion[]>(
      `/projects/${projectId}/environments/${envId}/versions`,
      { token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return await fail(err)
  }
}

/** Writes an old version as a new one; `expectedUpdatedAt` guards against a concurrent edit. */
export async function restoreEnvironmentVersionAction(
  projectId: string,
  envId: string,
  versionId: string,
  expectedUpdatedAt?: string
): Promise<EnvironmentResult> {
  try {
    await api(
      `/projects/${projectId}/environments/${envId}/versions/${versionId}/restore`,
      {
        method: "POST",
        body: expectedUpdatedAt ? { expectedUpdatedAt } : {},
        token: await requireToken(),
      }
    )
    revalidatePath(`/projects/${projectId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return await fail(err)
  }
}

export async function diffEnvironmentsAction(
  projectId: string,
  from: string,
  to: string
): Promise<EnvironmentResult<EnvironmentDiff>> {
  try {
    const data = await api<EnvironmentDiff>(
      `/projects/${projectId}/environments/diff?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return await fail(err)
  }
}

/** Copies the chosen variables from one environment into another. */
export async function promoteEnvironmentAction(
  projectId: string,
  targetId: string,
  sourceId: string,
  keys: string[],
  expectedUpdatedAt?: string
): Promise<EnvironmentResult> {
  try {
    await api(`/projects/${projectId}/environments/${targetId}/promote`, {
      method: "POST",
      body: {
        from: sourceId,
        keys,
        ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}),
      },
      token: await requireToken(),
    })
    revalidatePath(`/projects/${projectId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return await fail(err)
  }
}
