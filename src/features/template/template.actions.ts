"use server"

import { revalidatePath } from "next/cache"
import { requireToken } from "@/features/auth/auth.session"
import type {
  ComposeApp,
  ComposeServiceDomain,
  ComposeServicePort,
} from "@/features/compose/compose.entity"
import { api, ApiError } from "@/lib/api"

export interface DeployTemplateInput {
  projectId: string
  templateId: string
  name?: string
  variables: Record<string, string>
  serviceDomains: ComposeServiceDomain[]
  servicePorts: ComposeServicePort[]
}

export type DeployTemplateResult =
  { ok: true; id: string } | { ok: false; error: string }

/** Creates the stack and queues its first deploy; the caller navigates to it. */
export async function deployTemplateAction(
  input: DeployTemplateInput
): Promise<DeployTemplateResult> {
  try {
    const app = await api<ComposeApp>("/compose-apps/from-template", {
      method: "POST",
      body: input,
      token: await requireToken(),
    })
    revalidatePath(`/projects/${input.projectId}`)
    return { ok: true, id: app.id }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof ApiError
          ? err.message
          : "Tidak dapat terhubung ke server",
    }
  }
}
