import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { Certificate } from "./certificate.entity"

/** Every member may list them (no key material) to pick one for a domain. */
export async function listCertificates(): Promise<Certificate[]> {
  return api<Certificate[]>("/certificates", { token: await requireToken() })
}
