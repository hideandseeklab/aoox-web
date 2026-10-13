"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type {
  EnvironmentDiff,
  EnvironmentVersion,
  EnvironmentView,
  LinkView,
  ProjectVariableSet,
  VariableSetDetail,
} from "./variable-set.entity"

export type VariableResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string; status?: number }

async function fail(err: unknown): Promise<{
  ok: false
  error: string
  status?: number
}> {
  if (err instanceof ApiError)
    return { ok: false, error: err.message, status: err.status }
  return {
    ok: false,
    error: (await getTranslations("common"))("messages.serverUnreachable"),
  }
}

function revalidateSet(id?: string) {
  revalidatePath("/variables")
  if (id) revalidatePath(`/variables/${id}`)
}

// ---- Sets (instance owner/admin) ----

export async function createVariableSetAction(input: {
  name: string
  slug?: string
  description?: string
  sharedWithAll: boolean
  projectIds: string[]
}): Promise<VariableResult<{ id: string }>> {
  try {
    const set = await api<VariableSetDetail>("/variable-sets", {
      method: "POST",
      body: {
        name: input.name.trim(),
        ...(input.slug?.trim() ? { slug: input.slug.trim() } : {}),
        ...(input.description?.trim()
          ? { description: input.description.trim() }
          : {}),
        sharedWithAll: input.sharedWithAll,
        projectIds: input.sharedWithAll ? [] : input.projectIds,
      },
      token: await requireToken(),
    })
    revalidateSet()
    return { ok: true, data: { id: set.id } }
  } catch (err) {
    return await fail(err)
  }
}

export async function updateVariableSetAction(
  id: string,
  input: { name: string; description: string }
): Promise<VariableResult> {
  try {
    await api(`/variable-sets/${id}`, {
      method: "PATCH",
      body: {
        name: input.name.trim(),
        description: input.description.trim() || null,
      },
      token: await requireToken(),
    })
    revalidateSet(id)
    return { ok: true, data: undefined }
  } catch (err) {
    return await fail(err)
  }
}

export async function shareVariableSetAction(
  id: string,
  sharedWithAll: boolean,
  projectIds: string[]
): Promise<VariableResult> {
  try {
    await api(`/variable-sets/${id}/sharing`, {
      method: "PUT",
      body: { sharedWithAll, projectIds },
      token: await requireToken(),
    })
    revalidateSet(id)
    return { ok: true, data: undefined }
  } catch (err) {
    return await fail(err)
  }
}

export async function deleteVariableSetAction(
  id: string
): Promise<VariableResult> {
  try {
    await api<void>(`/variable-sets/${id}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidateSet()
    return { ok: true, data: undefined }
  } catch (err) {
    return await fail(err)
  }
}

// ---- Environments ----

export async function createEnvironmentAction(
  setId: string,
  name: string,
  isProtected: boolean
): Promise<VariableResult<{ id: string }>> {
  try {
    const env = await api<EnvironmentView>(
      `/variable-sets/${setId}/environments`,
      {
        method: "POST",
        body: { name, ...(isProtected ? { protected: true } : {}) },
        token: await requireToken(),
      }
    )
    revalidateSet(setId)
    return { ok: true, data: { id: env.id } }
  } catch (err) {
    return await fail(err)
  }
}

export async function deleteEnvironmentAction(
  setId: string,
  envId: string
): Promise<VariableResult> {
  try {
    await api<void>(`/variable-sets/${setId}/environments/${envId}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidateSet(setId)
    return { ok: true, data: undefined }
  } catch (err) {
    return await fail(err)
  }
}

/**
 * Reads the values of one environment. A POST on purpose (audited, refuses
 * viewers and, for protected environments, everyone but instance
 * owners/admins); never call it from a server component.
 */
export async function revealEnvironmentAction(
  setId: string,
  envId: string
): Promise<
  VariableResult<{
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
    }>(`/variable-sets/${setId}/environments/${envId}/reveal`, {
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
  setId: string,
  envId: string,
  variables: string,
  /** `updatedAt` from the reveal being edited; a newer save by someone else is a 409. */
  expectedUpdatedAt?: string,
  /** Secret flags the user changed: name to true/false. Others keep their flag. */
  flags?: Record<string, boolean>
): Promise<VariableResult> {
  if (variables.length > 20_000) {
    const t = await getTranslations("variables")
    return { ok: false, error: t("editor.tooLong") }
  }
  try {
    await api(`/variable-sets/${setId}/environments/${envId}`, {
      method: "PUT",
      body: {
        variables,
        ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}),
        ...(flags && Object.keys(flags).length > 0 ? { flags } : {}),
      },
      token: await requireToken(),
    })
    revalidateSet(setId)
    return { ok: true, data: undefined }
  } catch (err) {
    return await fail(err)
  }
}

export async function listEnvironmentVersionsAction(
  setId: string,
  envId: string
): Promise<VariableResult<EnvironmentVersion[]>> {
  try {
    const data = await api<EnvironmentVersion[]>(
      `/variable-sets/${setId}/environments/${envId}/versions`,
      { token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return await fail(err)
  }
}

/** Reads the full text of an earlier version (audited, same rule as reveal). */
export async function revealEnvironmentVersionAction(
  setId: string,
  envId: string,
  versionId: string
): Promise<VariableResult<{ variables: string; secretKeys: string[] }>> {
  try {
    const data = await api<{ variables: string; secretKeys?: string[] }>(
      `/variable-sets/${setId}/environments/${envId}/versions/${versionId}/reveal`,
      { method: "POST", token: await requireToken() }
    )
    return {
      ok: true,
      data: { variables: data.variables, secretKeys: data.secretKeys ?? [] },
    }
  } catch (err) {
    return await fail(err)
  }
}

/** Writes an old version as a new one; `expectedUpdatedAt` guards against a concurrent edit. */
export async function restoreEnvironmentVersionAction(
  setId: string,
  envId: string,
  versionId: string,
  expectedUpdatedAt?: string
): Promise<VariableResult> {
  try {
    await api(
      `/variable-sets/${setId}/environments/${envId}/versions/${versionId}/restore`,
      {
        method: "POST",
        body: expectedUpdatedAt ? { expectedUpdatedAt } : {},
        token: await requireToken(),
      }
    )
    revalidateSet(setId)
    return { ok: true, data: undefined }
  } catch (err) {
    return await fail(err)
  }
}

export async function diffEnvironmentsAction(
  setId: string,
  from: string,
  to: string
): Promise<VariableResult<EnvironmentDiff>> {
  try {
    const data = await api<EnvironmentDiff>(
      `/variable-sets/${setId}/diff?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return await fail(err)
  }
}

/** Copies the chosen variables from one environment of the set into another. */
export async function promoteEnvironmentAction(
  setId: string,
  targetId: string,
  sourceId: string,
  keys: string[],
  expectedUpdatedAt?: string
): Promise<VariableResult> {
  try {
    await api(`/variable-sets/${setId}/environments/${targetId}/promote`, {
      method: "POST",
      body: {
        from: sourceId,
        keys,
        ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}),
      },
      token: await requireToken(),
    })
    revalidateSet(setId)
    return { ok: true, data: undefined }
  } catch (err) {
    return await fail(err)
  }
}

// ---- Links of applications and stacks ----

export type LinkOwner = { kind: "application" | "compose"; id: string }

/** Replaces the ordered link list; returns the recomputed links. */
export async function replaceLinksAction(
  owner: LinkOwner,
  environmentIds: string[]
): Promise<VariableResult<LinkView[]>> {
  const base =
    owner.kind === "application"
      ? `/applications/${owner.id}`
      : `/compose-apps/${owner.id}`
  try {
    const data = await api<{ links: LinkView[] }>(`${base}/variable-sets`, {
      method: "PUT",
      body: {
        links: environmentIds.map((environmentId) => ({ environmentId })),
      },
      token: await requireToken(),
    })
    revalidatePath(
      owner.kind === "application"
        ? `/applications/${owner.id}`
        : `/compose/${owner.id}`
    )
    revalidatePath("/variables", "layout")
    return { ok: true, data: data.links }
  } catch (err) {
    return await fail(err)
  }
}

/** Sets shared with a project (the template dialog picks the project on the client). */
export async function fetchProjectVariableSetsAction(
  projectId: string
): Promise<VariableResult<ProjectVariableSet[]>> {
  try {
    const data = await api<ProjectVariableSet[]>(
      `/projects/${projectId}/variable-sets`,
      { token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return await fail(err)
  }
}
