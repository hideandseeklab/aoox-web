import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type {
  InstanceBackup,
  InstanceBackupSettings,
} from "./instance-backup.entity"

export async function listInstanceBackups(): Promise<InstanceBackup[]> {
  return api<InstanceBackup[]>("/instance/backups", {
    token: await requireToken(),
  })
}

export async function getInstanceBackupSettings(): Promise<InstanceBackupSettings> {
  return api<InstanceBackupSettings>("/instance/backup-settings", {
    token: await requireToken(),
  })
}
