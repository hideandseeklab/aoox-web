import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { Template } from "./template.entity"

export async function listTemplates(): Promise<Template[]> {
  return api<Template[]>("/templates", { token: await requireToken() })
}
