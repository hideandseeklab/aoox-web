import { ArrowLeft } from "lucide-react"
import { getProject } from "@/features/project/project.queries"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ApplicationDeployPanel } from "@/components/custom/application-deploy-panel"
import { ApplicationDomains } from "@/components/custom/application-domains"
import { ApplicationJobs } from "@/components/custom/application-jobs"
import { ApplicationMounts } from "@/components/custom/application-mounts"
import { VolumeBackups } from "@/components/custom/volume-backups"
import { ApplicationForm } from "@/components/custom/application-form"
import { ApplicationWebhook } from "@/components/custom/application-webhook"
import { DeleteApplicationButton } from "@/components/custom/delete-application-button"
import { PreviewsPanel } from "@/components/custom/previews-panel"
import { MetricsPanel } from "@/components/custom/metrics-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { updateApplicationAction } from "@/features/application/application.actions"
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
import { publicApiUrl } from "@/lib/api"

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

      <Tabs defaultValue="deploy">
        <TabsList>
          <TabsTrigger value="deploy">Deploy</TabsTrigger>
          <TabsTrigger value="domains">Domain ({domains.length})</TabsTrigger>
          <TabsTrigger value="mounts">Mount ({mounts.length})</TabsTrigger>
          <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
          <TabsTrigger value="webhook">Webhook</TabsTrigger>
          <TabsTrigger value="settings">Pengaturan</TabsTrigger>
        </TabsList>
        <TabsContent value="deploy" className="space-y-4 pt-4">
          <MetricsPanel
            target="application"
            id={app.id}
            initial={metrics}
            running={running}
          />
          <ApplicationDeployPanel
            app={app}
            deployments={deployments}
            publicApiUrl={publicApiUrl()}
          />
        </TabsContent>
        <TabsContent value="domains" className="pt-4">
          <ApplicationDomains
            applicationId={app.id}
            domains={domains}
            proxy={proxy}
            deployed={!!app.currentImage}
          />
        </TabsContent>
        <TabsContent value="mounts" className="pt-4">
          <ApplicationMounts
            owner={{ kind: "application", id: app.id }}
            mounts={mounts}
            canBind={canBind}
          />
          <div className="mt-4">
            <VolumeBackups
              app={app}
              mounts={mounts}
              backups={volumeBackups}
              destinations={destinations}
            />
          </div>
        </TabsContent>
        <TabsContent value="jobs" className="pt-4">
          <ApplicationJobs
            owner={{ kind: "application", id: app.id }}
            jobs={jobs}
          />
        </TabsContent>
        <TabsContent value="webhook" className="pt-4">
          <div className="space-y-4">
            <ApplicationWebhook applicationId={app.id} webhook={webhook} />
            <PreviewsPanel
              applicationId={app.id}
              enabled={app.previewsEnabled}
              initial={previews}
              proxyHttpPort={proxy.httpPort}
            />
          </div>
        </TabsContent>
        <TabsContent value="settings" className="pt-4">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Pengaturan</CardTitle>
              <CardDescription>
                Perubahan berlaku pada deploy berikutnya.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApplicationForm
                action={updateApplicationAction.bind(null, app.id)}
                defaultValues={{
                  name: app.name,
                  gitUrl: app.gitUrl ?? "",
                  sourceType: app.sourceType,
                  imageRef: app.imageRef ?? "",
                  imageRegistryId: app.imageRegistryId ?? "",
                  autoUpdate: app.autoUpdate ? "on" : "",
                  deployMode: app.deployMode,
                  replicas: String(app.replicas ?? 1),
                  swarmNodeId: app.swarmNodeId ?? "",
                  swarmConstraint: app.swarmConstraint ?? "",
                  updateParallelism: String(app.updateParallelism ?? 1),
                  updateDelaySeconds: String(app.updateDelaySeconds ?? 2),
                  updateOrder: app.updateOrder ?? "auto",
                  autoUpdateIntervalMinutes: String(
                    app.autoUpdateIntervalMinutes ?? 60
                  ),
                  gitBranch: app.gitBranch,
                  dockerfilePath: app.dockerfilePath,
                  gitCredentialId: app.gitCredentialId ?? "",
                  containerPort: String(app.containerPort),
                  hostPort: app.hostPort ? String(app.hostPort) : "",
                  healthcheckPath: app.healthcheckPath ?? "",
                  cpuMillicores: app.cpuMillicores
                    ? String(app.cpuMillicores)
                    : "",
                  memoryMb: app.memoryMb ? String(app.memoryMb) : "",
                  deploymentKeep: String(app.deploymentKeep ?? 10),
                  staticBuildCommand: app.staticBuildCommand ?? "",
                  staticOutputDir: app.staticOutputDir ?? "dist",
                  staticSpa: app.staticSpa === false ? "" : "on",
                  env: app.env,
                  buildArgs: app.buildArgs,
                  buildType: app.buildType,
                  serverId: app.serverId ?? "",
                  previewsEnabled: app.previewsEnabled ? "on" : "",
                  previewDomain: app.previewDomain ?? "",
                }}
                submitLabel="Simpan"
                credentials={credentials}
                registries={registries}
                databaseSlugs={databases.map((d) => d.slug)}
                servers={servers}
                swarmActive={swarm?.state === "active" && swarm.isManager}
                swarmNodes={swarm?.nodes ?? []}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
