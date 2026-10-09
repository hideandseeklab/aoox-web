"use server"

import { getTranslations } from "next-intl/server"
import { revalidatePath } from "next/cache"
import type { Application } from "@/features/application/application.entity"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { VolumeBackup } from "./volume-backup.entity"

export type ActionResult<T = undefined> =
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

export async function createVolumeBackupAction(
  applicationId: string,
  mountId: string
): Promise<ActionResult<VolumeBackup>> {
  try {
    const data = await api<VolumeBackup>(
      `/applications/${applicationId}/mounts/${mountId}/backups`,
      { method: "POST", token: await requireToken() }
    )
    revalidatePath(`/applications/${applicationId}`)
    return data.status === "success"
      ? { ok: true, data }
      : { ok: false, error:
            data.errorMessage ??
            (await getTranslations("applications"))("volumeBackups.failed"),
        }
  } catch (err) {
    return await fail(err)
  }
}

export async function restoreVolumeBackupAction(
  applicationId: string,
  backupId: string
): Promise<ActionResult> {
  try {
    await api<void>(`/volume-backups/${backupId}/restore`, {
      method: "POST",
      token: await requireToken(),
    })
    revalidatePath(`/applications/${applicationId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return await fail(err)
  }
}

export async function deleteVolumeBackupAction(
  applicationId: string,
  backupId: string
): Promise<ActionResult> {
  try {
    await api<void>(`/volume-backups/${backupId}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath(`/applications/${applicationId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return await fail(err)
  }
}

export async function updateVolumeBackupScheduleAction(
  applicationId: string,
  backupCron: string | null,
  backupKeep: number,
  backupDestinationId: string | null
): Promise<ActionResult<Application>> {
  try {
    const data = await api<Application>(
      `/applications/${applicationId}/backup-schedule`,
      {
        method: "PATCH",
        body: { backupCron, backupKeep, backupDestinationId },
        token: await requireToken(),
      }
    )
    revalidatePath(`/applications/${applicationId}`)
    return { ok: true, data }
  } catch (err) {
    return await fail(err)
  }
}
