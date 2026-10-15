"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { api, ApiError } from "@/lib/api"
import type {
  Project,
  ProjectListItem,
  ProjectResourceUsageResponse,
} from "./project.entity"
import { requireToken } from "@/features/auth/auth.session"
import { getProjectResourceUsage, listProjects } from "./project.queries"
import { createProjectSchema } from "./project.schema"

export interface ProjectFormState {
  error?: string
  fieldErrors?: Partial<Record<"name" | "description", string[]>>
  values?: { name: string; description: string }
}

async function parseForm(formData: FormData) {
  const t = await getTranslations("projects")
  const values = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
  }
  const parsed = createProjectSchema(t).safeParse(values)
  if (parsed.success)
    return { values, data: parsed.data, fieldErrors: undefined }

  const fieldErrors: ProjectFormState["fieldErrors"] = {}
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as "name" | "description"
    ;(fieldErrors[key] ??= []).push(issue.message)
  }
  return { values, data: undefined, fieldErrors }
}

async function toMessage(err: unknown): Promise<string> {
  if (err instanceof ApiError) return err.message
  return (await getTranslations("common"))("messages.serverUnreachable")
}

export async function createProjectAction(
  _prev: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const { values, data, fieldErrors } = await parseForm(formData)
  if (!data) return { fieldErrors, values }

  let project: Project
  try {
    project = await api<Project>("/projects", {
      method: "POST",
      body: data,
      token: await requireToken(),
    })
  } catch (err) {
    return { error: await toMessage(err), values }
  }

  revalidatePath("/projects")
  redirect(`/projects/${project.id}`)
}

export async function updateProjectAction(
  id: string,
  _prev: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const { values, data, fieldErrors } = await parseForm(formData)
  if (!data) return { fieldErrors, values }

  try {
    await api<Project>(`/projects/${id}`, {
      method: "PATCH",
      body: data,
      token: await requireToken(),
    })
  } catch (err) {
    return { error: await toMessage(err), values }
  }

  revalidatePath("/projects")
  revalidatePath(`/projects/${id}`)
  return { values }
}

/** Polled by the project detail page's resource panel; a failure yields an empty reading, not an error page. */
export async function fetchProjectResourceUsageAction(
  id: string
): Promise<ProjectResourceUsageResponse> {
  try {
    return await getProjectResourceUsage(id)
  } catch {
    return { current: null, history: [], containers: 0 }
  }
}

/** For the command palette: `GET /projects` (with `instances[]`), read when it is first opened; a failure yields an empty list. */
export async function fetchProjectsAction(): Promise<ProjectListItem[]> {
  try {
    return await listProjects()
  } catch {
    return []
  }
}

/**
 * `purge` also deletes the data volumes. A failure (for example the Docker
 * daemon being unreachable, answered as 502) comes back as a message for the
 * dialog instead of an error page; the project is kept, so it can be retried.
 */
export async function deleteProjectAction(
  id: string,
  purge: boolean
): Promise<{ error: string } | undefined> {
  try {
    await api<void>(`/projects/${id}${purge ? "?purge=true" : ""}`, {
      method: "DELETE",
      token: await requireToken(),
    })
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    const t = await getTranslations("common")
    return { error: t("messages.serverUnreachable") }
  }
  revalidatePath("/projects")
  redirect("/projects")
}
