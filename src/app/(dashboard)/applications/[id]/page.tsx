import { ArrowLeft } from "lucide-react"
import { getProject } from "@/features/project/project.queries"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ApplicationTabs } from "@/components/custom/application-tabs"
import { DeleteApplicationButton } from "@/components/custom/delete-application-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import {
  getApplication,
  getWebhook,
  listDeployments,
  listDomains,
  listMounts,
  listPreviews,
} from "@/features/application/application.queries"
import { listBackupDestinations } from "@/features/backup-destination/backup-destination.queries"
import { listJobs } from "@/features/job/job.queries"
import { listVolumeBackups } from "@/features/volume-backup/volume-backup.queries"
import { listRegistries } from "@/features/registry/registry.queries"
import { listGitCredentials } from "@/features/git-credential/git-credential.queries"
import { listDatabases } from "@/features/managed-database/managed-database.queries"
import { fetchMetricsAction } from "@/features/monitoring/monitoring.actions"
import { listServers } from "@/features/server/server.queries"
import { getProxyStatus } from "@/features/proxy/proxy.queries"
import { getSwarmStatus } from "@/features/swarm/swarm.queries"
import { publicApiUrl, webOrigin } from "@/lib/api"

export default async function ApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  /** Set by the "Aplikasi baru" page's "Domain" option; see create-application-page-form.tsx. */
  searchParams: Promise<{ domainProxyAutoProvisioned?: string }>
}) {
  const { id } = await params
  const { domainProxyAutoProvisioned } = await searchParams
  const app = await getApplication(id)
  if (!app) notFound()
  const [
    deployments,
    domains,
    mounts,
    jobs,
    volumeBackups,
    destinations,
    proxy,
    webhook,
    credentials,
    registries,
    databases,
    metrics,
    servers,
    previews,
    session,
    swarm,
  ] = await Promise.all([
    listDeployments(app.id),
    listDomains(app.id),
    listMounts({ kind: "application", id: app.id }),
    listJobs({ kind: "application", id: app.id }),
    listVolumeBackups(app.id),
    listBackupDestinations(),
    getProxyStatus(),
    getWebhook(app.id),
    listGitCredentials(),
    listRegistries().catch(() => []),
    listDatabases(app.projectId),
    fetchMetricsAction("application", app.id),
    // Members get 403 here; they simply cannot move apps between servers.
    listServers().catch(() => []),
    listPreviews(app.id),
    getVerifiedSession(),
    // Owner/admin only; members keep container mode.
    getSwarmStatus().catch(() => null),
  ])
  // Bind mounts expose the host filesystem: same roles as the host shell.
  const canBind = session ? canUseTerminal(session.user) : false
  const server = servers.find((s) => s.id === app.serverId) ?? null
  const running = app.container?.state === "running"

  const project = await getProject(app.projectId)
  return (
    <>
      <SetBreadcrumb
        items={[
          { label: "Projects", href: "/projects" },
          {
            label: project?.name ?? "Project",
            href: `/projects/${app.projectId}`,
          },
          { label: app.name },
        ]}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon" className="mt-0.5">
            <Link
              href={`/projects/${app.projectId}`}
              aria-label="Kembali ke project"
            >
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{app.name}</h1>
              <Badge variant={running ? "default" : "secondary"}>
                {app.container ? app.container.state : "belum deploy"}
              </Badge>
              {server && <Badge variant="outline">{server.name}</Badge>}
              {app.service && (
                <Badge
                  variant="outline"
                  title={app.service.tasks
                    .filter((t) => t.desiredState === "running")
                    .map(
                      (t) => `#${t.slot ?? "?"} ${t.node ?? "?"}: ${t.state}`
                    )
                    .join("\n")}
                >
                  service {app.service.running}/{app.service.desired}
                  {app.service.updateState &&
                    app.service.updateState !== "completed" &&
                    ` · ${app.service.updateState}`}
                </Badge>
              )}
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {app.appName} ·{" "}
              {app.sourceType === "image"
                ? app.imageRef
                : `${app.gitUrl}#${app.gitBranch}`}
              {app.hostPort && (
                <>
                  {" "}
                  ·{" "}
                  <a
                    className="underline"
                    href={`http://localhost:${app.hostPort}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    :{app.hostPort}
                  </a>
                </>
              )}
            </p>
          </div>
        </div>
        {app.projectRole === "viewer" ? (
          <Badge variant="outline">Baca saja</Badge>
        ) : (
          <DeleteApplicationButton
            id={app.id}
            projectId={app.projectId}
            name={app.name}
          />
        )}
      </div>

      <ApplicationTabs
        app={app}
        deployments={deployments}
        domains={domains}
        mounts={mounts}
        jobs={jobs}
        volumeBackups={volumeBackups}
        destinations={destinations}
        proxy={proxy}
        webhook={webhook}
        credentials={credentials}
        registries={registries}
        databaseSlugs={databases.map((d) => d.slug)}
        metrics={metrics}
        servers={servers}
        previews={previews}
        canBind={canBind}
        swarmActive={swarm?.state === "active" && swarm.isManager}
        swarmNodes={swarm?.nodes ?? []}
        publicApiUrl={publicApiUrl()}
        webOrigin={webOrigin()}
        domainProxyAutoProvisioned={domainProxyAutoProvisioned === "1"}
      />
    </>
  )
}
