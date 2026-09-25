"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { api, ApiError } from "@/lib/api"
import type { Project } from "./project.entity"
import { requireToken } from "@/features/auth/auth.session"
import { projectSchema } from "./project.schema"

export interface ProjectFormState {
  error?: string
  fieldErrors?: Partial<Record<"name" | "description" | "env", string[]>>
  values?: { name: string; description: string; env?: string }
}

function parseForm(formData: FormData) {
  const values = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    // The create dialog has no env field; omit it so the API's whitelist passes.
    ...(formData.has("env") ? { env: String(formData.get("env") ?? "") } : {}),
  }
  const parsed = projectSchema.safeParse(values)
  if (parsed.success)
    return { values, data: parsed.data, fieldErrors: undefined }

  const fieldErrors: ProjectFormState["fieldErrors"] = {}
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as "name" | "description" | "env"
    ;(fieldErrors[key] ??= []).push(issue.message)
  }
  return { values, data: undefined, fieldErrors }
}

function toMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  return "Tidak dapat terhubung ke server"
}

export async function createProjectAction(
  _prev: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const { values, data, fieldErrors } = parseForm(formData)
  if (!data) return { fieldErrors, values }

  let project: Project
  try {
    project = await api<Project>("/projects", {
      method: "POST",
      body: data,
      token: await requireToken(),
    })
  } catch (err) {
    return { error: toMessage(err), values }
  }

  revalidatePath("/projects")
  redirect(`/projects/${project.id}`)
}

export async function updateProjectAction(
  id: string,
  _prev: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const { values, data, fieldErrors } = parseForm(formData)
  if (!data) return { fieldErrors, values }

  try {
    await api<Project>(`/projects/${id}`, {
      method: "PATCH",
      body: data,
      token: await requireToken(),
    })
  } catch (err) {
    return { error: toMessage(err), values }
  }

  revalidatePath("/projects")
  revalidatePath(`/projects/${id}`)
  return { values }
}

export async function deleteProjectAction(id: string): Promise<void> {
  await api<void>(`/projects/${id}`, {
    method: "DELETE",
    token: await requireToken(),
  })
  revalidatePath("/projects")
  redirect("/projects")
}
