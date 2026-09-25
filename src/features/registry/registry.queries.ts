import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type {
  Registry,
  RepositorySummary,
  SelfHostedStatus,
  Tag,
} from "./registry.entity"

export async function getSelfHostedStatus(): Promise<SelfHostedStatus> {
  return api<SelfHostedStatus>("/registries/self-hosted", {
    token: await requireToken(),
  })
}

export async function listRegistries(): Promise<Registry[]> {
  return api<Registry[]>("/registries", { token: await requireToken() })
}

export async function listRepositories(
  registryId: string
): Promise<RepositorySummary[]> {
  return api<RepositorySummary[]>(`/registries/${registryId}/repositories`, {
    token: await requireToken(),
  })
}

export async function listTags(
  registryId: string,
  repository: string
): Promise<Tag[]> {
  return api<Tag[]>(
    `/registries/${registryId}/repositories/${repository}/tags`,
    {
      token: await requireToken(),
    }
  )
}
