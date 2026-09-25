import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { WebhookInfo } from "@/features/application/application.entity"
import type {
  ComposeApp,
  ComposeAppDetail,
  ComposeDeployment,
} from "./compose.entity"

export async function listComposeApps(
  projectId: string
): Promise<ComposeApp[]> {
  return api<ComposeApp[]>(`/compose-apps?projectId=${projectId}`, {
    token: await requireToken(),
  })
}

export async function getComposeApp(
  id: string
): Promise<ComposeAppDetail | null> {
  try {
    return await api<ComposeAppDetail>(`/compose-apps/${id}`, {
      token: await requireToken(),
    })
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
      return null
    }
    throw err
  }
}

export async function listComposeDeployments(
  id: string
): Promise<ComposeDeployment[]> {
  return api<ComposeDeployment[]>(`/compose-apps/${id}/deployments`, {
    token: await requireToken(),
  })
}

/** Webhook URL + secret; `supported` is false for template stacks (no repo). */
export async function getComposeWebhook(
  id: string
): Promise<(WebhookInfo & { supported: boolean }) | null> {
  try {
    return await api<WebhookInfo & { supported: boolean }>(
      `/compose-apps/${id}/webhook`,
      { token: await requireToken() }
    )
  } catch (err) {
    if (err instanceof ApiError) return null
    throw err
  }
}
