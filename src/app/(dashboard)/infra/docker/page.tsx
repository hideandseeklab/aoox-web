import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"
import { DockerContainers } from "@/components/custom/docker-containers"
import { DockerDiskStrip } from "@/components/custom/docker-disk-strip"
import { DockerImages } from "@/components/custom/docker-images"
import { DockerNetworks } from "@/components/custom/docker-networks"
import { DockerToolbar } from "@/components/custom/docker-toolbar"
import { DockerVolumes } from "@/components/custom/docker-volumes"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { DOCKER_TABS, type DockerTab } from "@/features/docker/docker.entity"
import {
  getDockerContainers,
  getDockerImages,
  getDockerNetworks,
  getDockerVolumes,
} from "@/features/docker/docker.queries"
import type { DiskUsage } from "@/features/maintenance/maintenance.entity"
import { getDiskUsage } from "@/features/maintenance/maintenance.queries"
import { listServers } from "@/features/server/server.queries"
import { ApiError } from "@/lib/api"

export const metadata = { title: "Docker · aoox" }

async function loadTab(
  tab: DockerTab,
  serverId: string | null,
  isOwner: boolean
) {
  switch (tab) {
    case "containers":
      return (
        <DockerContainers
          containers={await getDockerContainers(serverId)}
          serverId={serverId}
          isOwner={isOwner}
        />
      )
    case "images":
      return (
        <DockerImages
          images={await getDockerImages(serverId)}
          serverId={serverId}
          isOwner={isOwner}
        />
      )
    case "volumes":
      return <DockerVolumes volumes={await getDockerVolumes(serverId)} />
    case "networks":
      return <DockerNetworks networks={await getDockerNetworks(serverId)} />
  }
}

export default async function DockerPage({
  searchParams,
}: {
  searchParams: Promise<{ server?: string; tab?: string }>
}) {
  const t = await getTranslations("docker")
  const session = await getVerifiedSession()
  // Owner/admin only (the API enforces it too; members get a 404 rather than a 403 page).
  if (!session || !canUseTerminal(session.user)) notFound()
  const sp = await searchParams
  const servers = await listServers()
  const serverId = servers.some((s) => s.id === sp.server) ? sp.server! : null
  const tab = DOCKER_TABS.find((t) => t === sp.tab) ?? "containers"

  // Disk usage and cleanup cover the aoox host only, so the strip is shown only for it.
  let disk: { usage: DiskUsage | null; error: string | null } | null = null
  if (serverId === null) {
    try {
      disk = { usage: await getDiskUsage(), error: null }
    } catch (err) {
      disk = {
        usage: null,
        error: err instanceof ApiError ? err.message : null,
      }
    }
  }

  let content: React.ReactNode
  try {
    content = await loadTab(tab, serverId, session.user.role === "owner")
  } catch (err) {
    content = (
      <Alert variant="destructive">
        <AlertTitle>{t("page.loadError")}</AlertTitle>
        <AlertDescription>
          {err instanceof ApiError
            ? err.message
            : t("errors.serverUnreachable")}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      {/* Lives under Platform in the sidebar, so the crumb is just "Docker" (the route stays /infra/docker). */}
      <SetBreadcrumb items={[{ label: "Docker" }]} />
      <div>
        <h1 className="text-lg font-semibold">Docker</h1>
        <p className="text-xs text-muted-foreground">
          {t("page.description")}
        </p>
      </div>
      {disk && (
        <DockerDiskStrip
          usage={disk.usage}
          loadError={disk.error}
          canRun={session.user.role === "owner"}
        />
      )}
      <DockerToolbar servers={servers} serverId={serverId} tab={tab}>
        {content}
      </DockerToolbar>
    </>
  )
}
