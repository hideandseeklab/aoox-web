import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { BackupDestination } from "./backup-destination.entity"

export async function listBackupDestinations(): Promise<BackupDestination[]> {
  return api<BackupDestination[]>("/backup-destinations", {
    token: await requireToken(),
  })
}
