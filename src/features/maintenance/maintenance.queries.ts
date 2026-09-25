import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { DiskUsage } from "./maintenance.entity"

export async function getDiskUsage(): Promise<DiskUsage> {
  return api<DiskUsage>("/maintenance/disk", { token: await requireToken() })
}
