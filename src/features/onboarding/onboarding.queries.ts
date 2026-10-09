import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type { Onboarding } from "./onboarding.entity"

/** One cheap call; for non-owners the API answers `visible: false` straight away. */
export async function getOnboarding(): Promise<Onboarding> {
  return api<Onboarding>("/onboarding", { token: await requireToken() })
}
