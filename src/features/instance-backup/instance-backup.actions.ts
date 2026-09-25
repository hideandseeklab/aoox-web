"use server"

import { revalidatePath } from "next/cache"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type {
  InstanceBackup,
  InstanceBackupSettings,
  RestoreReport,
} from "./instance-backup.entity"

const API_URL = process.env.API_URL ?? "http://localhost:3001"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

function fail(err: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error:
      err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server",
  }
}

export async function createInstanceBackupAction(): Promise<
  ActionResult<InstanceBackup>
> {
  try {
    const data = await api<InstanceBackup>("/instance/backups", {
      method: "POST",
      token: await requireToken(),
    })
    revalidatePath("/settings")
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function restoreInstanceBackupAction(
  id: string
): Promise<ActionResult<RestoreReport>> {
  try {
    const data = await api<RestoreReport>(
      `/instance/backups/${encodeURIComponent(id)}/restore`,
      { method: "POST", token: await requireToken() }
    )
    revalidatePath("/", "layout")
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteInstanceBackupAction(
  id: string
): Promise<ActionResult> {
  try {
    await api<void>(`/instance/backups/${encodeURIComponent(id)}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath("/settings")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function updateInstanceBackupSettingsAction(
  settings: InstanceBackupSettings
): Promise<ActionResult<InstanceBackupSettings>> {
  try {
    const data = await api<InstanceBackupSettings>(
      "/instance/backup-settings",
      { method: "PATCH", body: settings, token: await requireToken() }
    )
    revalidatePath("/settings")
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

/** Multipart upload of a `.json.gz` snapshot (new server / file kept elsewhere). */
export async function restoreInstanceUploadAction(
  formData: FormData
): Promise<ActionResult<RestoreReport>> {
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Pilih file backup dulu" }
  }
  const body = new FormData()
  body.set("file", file, file.name)
  try {
    const res = await fetch(`${API_URL}/instance/restore`, {
      method: "POST",
      body,
      headers: { Authorization: `Bearer ${await requireToken()}` },
    })
    const json = (await res.json().catch(() => ({}))) as {
      message?: string | string[]
    } & Partial<RestoreReport>
    if (!res.ok) {
      const m = json.message
      return {
        ok: false,
        error: Array.isArray(m) ? m.join(", ") : (m ?? `HTTP ${res.status}`),
      }
    }
    revalidatePath("/", "layout")
    return { ok: true, data: json as RestoreReport }
  } catch {
    return { ok: false, error: "Tidak dapat terhubung ke server" }
  }
}
