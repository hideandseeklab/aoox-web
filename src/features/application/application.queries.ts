import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { PreviewDeployment } from "./preview.entity"
import { mountOwnerBase } from "./application.entity"
import type {
  Application,
  ApplicationDetail,
  Deployment,
  DeploymentSummary,
  Domain,
  Mount,
  MountOwner,
  WebhookInfo,
} from "./application.entity"

export async function listApplications(
  projectId: string
): Promise<Application[]> {
  return api<Application[]>(`/applications?projectId=${projectId}`, {
    token: await requireToken(),
  })
}

export async function getApplication(
  id: string
): Promise<ApplicationDetail | null> {
  try {
    return await api<ApplicationDetail>(`/applications/${id}`, {
      token: await requireToken(),
    })
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
      return null
    }
    throw err
  }
}

export async function listDeployments(
  applicationId: string
): Promise<DeploymentSummary[]> {
  return api<DeploymentSummary[]>(
    `/applications/${applicationId}/deployments`,
    {
      token: await requireToken(),
    }
  )
}

export async function getDeployment(id: string): Promise<Deployment> {
  return api<Deployment>(`/deployments/${id}`, { token: await requireToken() })
}

export async function listDomains(applicationId: string): Promise<Domain[]> {
  return api<Domain[]>(`/applications/${applicationId}/domains`, {
    token: await requireToken(),
  })
}

export async function listMounts(owner: MountOwner): Promise<Mount[]> {
  return api<Mount[]>(`${mountOwnerBase(owner)}/mounts`, {
    token: await requireToken(),
  })
}

export async function getWebhook(applicationId: string): Promise<WebhookInfo> {
  return api<WebhookInfo>(`/applications/${applicationId}/webhook`, {
    token: await requireToken(),
  })
}

export async function listPreviews(
  applicationId: string
): Promise<PreviewDeployment[]> {
  return api<PreviewDeployment[]>(`/applications/${applicationId}/previews`, {
    token: await requireToken(),
  })
}
