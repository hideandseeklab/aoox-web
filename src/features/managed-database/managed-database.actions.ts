"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { DatabaseBackup, ManagedDatabase } from "./managed-database.entity"
import { databaseSchema } from "./managed-database.schema"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

function fail(err: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error:
      err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server",
  }
}

type Field = "name" | "engine" | "imageTag" | "hostPort"

export interface DatabaseFormState {
  error?: string
  fieldErrors?: Partial<Record<Field, string[]>>
  values?: Record<Field, string>
}

export async function createDatabaseAction(
  projectId: string,
  _prev: DatabaseFormState,
  formData: FormData
): Promise<DatabaseFormState> {
  const values: Record<Field, string> = {
    name: String(formData.get("name") ?? ""),
    engine: String(formData.get("engine") ?? "postgres"),
    imageTag: String(formData.get("imageTag") ?? ""),
    hostPort: String(formData.get("hostPort") ?? ""),
  }
  const parsed = databaseSchema.safeParse(values)
  if (!parsed.success) {
    const fieldErrors: DatabaseFormState["fieldErrors"] = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as Field
      ;(fieldErrors[key] ??= []).push(issue.message)
    }
    return { fieldErrors, values }
  }

  let db: ManagedDatabase
  try {
    db = await api<ManagedDatabase>("/databases", {
      method: "POST",
      body: {
        projectId,
        ...parsed.data,
        imageTag: parsed.data.imageTag || undefined,
      },
      token: await requireToken(),
    })
  } catch (err) {
    return { ...fail(err), values }
  }
  revalidatePath(`/projects/${projectId}`)
  redirect(`/databases/${db.id}`)
}

export async function stopDatabaseAction(id: string): Promise<ActionResult> {
  try {
    await api<ManagedDatabase>(`/databases/${id}/stop`, {
      method: "POST",
      token: await requireToken(),
    })
    revalidatePath(`/databases/${id}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function startDatabaseAction(id: string): Promise<ActionResult> {
  try {
    await api<ManagedDatabase>(`/databases/${id}/start`, {
      method: "POST",
      token: await requireToken(),
    })
    revalidatePath(`/databases/${id}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function updateDatabaseResourcesAction(
  id: string,
  cpuMillicores: number | null,
  memoryMb: number | null
): Promise<ActionResult<ManagedDatabase>> {
  try {
    const data = await api<ManagedDatabase>(`/databases/${id}`, {
      method: "PATCH",
      body: { cpuMillicores, memoryMb },
      token: await requireToken(),
    })
    revalidatePath(`/databases/${id}`)
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteDatabaseAction(
  id: string,
  projectId: string,
  purge: boolean
): Promise<void> {
  await api<void>(`/databases/${id}?purge=${purge}`, {
    method: "DELETE",
    token: await requireToken(),
  })
  revalidatePath(`/projects/${projectId}`)
  redirect(`/projects/${projectId}`)
}

export async function createBackupAction(
  databaseId: string
): Promise<ActionResult<DatabaseBackup>> {
  try {
    const data = await api<DatabaseBackup>(`/databases/${databaseId}/backups`, {
      method: "POST",
      token: await requireToken(),
    })
    revalidatePath(`/databases/${databaseId}`)
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function restoreBackupAction(
  databaseId: string,
  backupId: string
): Promise<ActionResult> {
  try {
    await api<{ restored: true }>(`/backups/${backupId}/restore`, {
      method: "POST",
      token: await requireToken(),
    })
    revalidatePath(`/databases/${databaseId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteBackupAction(
  databaseId: string,
  backupId: string
): Promise<ActionResult> {
  try {
    await api<void>(`/backups/${backupId}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath(`/databases/${databaseId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function updateBackupScheduleAction(
  databaseId: string,
  backupCron: string | null,
  backupKeep: number,
  backupDestinationId: string | null,
  backupAllDatabases: boolean
): Promise<ActionResult<ManagedDatabase>> {
  try {
    const data = await api<ManagedDatabase>(
      `/databases/${databaseId}/backup-schedule`,
      {
        method: "PATCH",
        body: {
          backupCron,
          backupKeep,
          backupDestinationId,
          backupAllDatabases,
        },
        token: await requireToken(),
      }
    )
    revalidatePath(`/databases/${databaseId}`)
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}
