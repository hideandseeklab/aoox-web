import { api } from "@/lib/api"

export interface SetupStatus {
  needsSetup: boolean
}

/** True while the API has no user yet (first-run onboarding). */
export async function needsSetup(): Promise<boolean> {
  try {
    const status = await api<SetupStatus>("/auth/setup-status")
    return status.needsSetup
  } catch {
    // API unreachable: fall through to sign-in, which will surface the error.
    return false
  }
}
