import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { VolumeBackup } from "./volume-backup.entity"

export async function listVolumeBackups(
  applicationId: string
): Promise<VolumeBackup[]> {
  return api<VolumeBackup[]>(`/applications/${applicationId}/volume-backups`, {
    token: await requireToken(),
  })
}
