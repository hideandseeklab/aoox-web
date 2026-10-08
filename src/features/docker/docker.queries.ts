import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type {
  DockerContainer,
  DockerImage,
  DockerNetwork,
  DockerVolume,
} from "./docker.entity"

/** `serverId` null = the aoox host; owner/admin only (the page gates on it). */
function path(resource: string, serverId: string | null) {
  return `/docker/${resource}${serverId ? `?serverId=${encodeURIComponent(serverId)}` : ""}`
}

export async function getDockerContainers(
  serverId: string | null
): Promise<DockerContainer[]> {
  return api<DockerContainer[]>(path("containers", serverId), {
    token: await requireToken(),
  })
}

export async function getDockerImages(
  serverId: string | null
): Promise<DockerImage[]> {
  return api<DockerImage[]>(path("images", serverId), {
    token: await requireToken(),
  })
}

export async function getDockerVolumes(
  serverId: string | null
): Promise<DockerVolume[]> {
  return api<DockerVolume[]>(path("volumes", serverId), {
    token: await requireToken(),
  })
}

export async function getDockerNetworks(
  serverId: string | null
): Promise<DockerNetwork[]> {
  return api<DockerNetwork[]>(path("networks", serverId), {
    token: await requireToken(),
  })
}
