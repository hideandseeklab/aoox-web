import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { SecretConnection } from "./secret-connection.entity"

/** Every member may list them (names only) to pick one for an application. */
export async function listSecretConnections(): Promise<SecretConnection[]> {
  return api<SecretConnection[]>("/secret-connections", {
    token: await requireToken(),
  })
}
