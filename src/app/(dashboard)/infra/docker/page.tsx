import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { notFound } from "next/navigation"
import { LinkArrow } from "@/components/custom/arrows"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"
import { DockerContainers } from "@/components/custom/docker-containers"
import { DockerImages } from "@/components/custom/docker-images"
import { DockerNetworks } from "@/components/custom/docker-networks"
import { DockerToolbar } from "@/components/custom/docker-toolbar"
import { DockerVolumes } from "@/components/custom/docker-volumes"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { DOCKER_TABS, type DockerTab } from "@/features/docker/docker.entity"
import {
  getDockerContainers,
  getDockerImages,
  getDockerNetworks,
  getDockerVolumes,
} from "@/features/docker/docker.queries"
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
      <DockerToolbar servers={servers} serverId={serverId} tab={tab}>
        {content}
      </DockerToolbar>
      <p className="text-xs text-muted-foreground">
        {t.rich("page.diskNote", {
          link: (c) => (
            <Button
              asChild
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
            >
              <Link href="/infra/disk">
                {c}
                <LinkArrow />
              </Link>
            </Button>
          ),
        })}
      </p>
    </>
  )
}
