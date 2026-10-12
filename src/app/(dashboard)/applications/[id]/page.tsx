import { ArrowLeft } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { getProject } from "@/features/project/project.queries"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"
import { SourceIcon } from "@/components/custom/brand-icon"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ApplicationStatusActions } from "@/components/custom/application-actions"
import { ApplicationTabs } from "@/components/custom/application-tabs"
import { StatusStrip } from "@/components/custom/status-strip"
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
  listDomainMiddlewares,
  listPreviews,
} from "@/features/application/application.queries"
import { listBackupDestinations } from "@/features/backup-destination/backup-destination.queries"
import {
  getDomainDnsOptions,
  listDnsConnections,
} from "@/features/dns/dns.queries"
import { listCertificates } from "@/features/certificate/certificate.queries"
import { listJobs } from "@/features/job/job.queries"
import { listVolumeBackups } from "@/features/volume-backup/volume-backup.queries"
import { listRegistries } from "@/features/registry/registry.queries"
import { listGitCredentials } from "@/features/git-credential/git-credential.queries"
import { listDatabases } from "@/features/managed-database/managed-database.queries"
import { getHttpMonitor } from "@/features/http-monitor/http-monitor.queries"
import { getResourceAlerts } from "@/features/resource-alert/resource-alert.queries"
import { listSecretConnections } from "@/features/secret-connection/secret-connection.queries"
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
  /** Set by the "New application" page's "Domain" option; see create-application-page-form.tsx. */
  searchParams: Promise<{ domainProxyAutoProvisioned?: string }>
}) {
  const t = await getTranslations("applications")
  const tb = await getTranslations("breadcrumb")
  const tc = await getTranslations("common")
  const { id } = await params
  const { domainProxyAutoProvisioned } = await searchParams
  const app = await getApplication(id)
  if (!app) notFound()
  const [
    deployments,
    domains,
    certificates,
    middlewareOptions,
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
    monitor,
    alerts,
    secretConnections,
    servers,
    previews,
    session,
    swarm,
    dnsConnections,
    dnsOptions,
  ] = await Promise.all([
    listDeployments(app.id),
    listDomains(app.id),
    // Names and coverage only, for the domain's certificate picker; [] on an older API.
    listCertificates().catch(() => []),
    // Names only, for the domain's middleware picker; [] on an older API.
    listDomainMiddlewares(app.id).catch(() => []),
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
    getHttpMonitor(app.id).catch(() => null),
    getResourceAlerts("application", app.id).catch(() => null),
    // Names only, for the secret source picker; [] when the API has none.
    listSecretConnections().catch(() => []),
    // Members get 403 here; they simply cannot move apps between servers.
    listServers().catch(() => []),
    listPreviews(app.id),
    getVerifiedSession(),
    // Owner/admin only; members keep container mode.
    getSwarmStatus().catch(() => null),
    // Names only; [] on an older API without DNS providers.
    listDnsConnections().catch(() => []),
    getDomainDnsOptions(app.id).catch(() => ({ proxyDnsEnabled: false })),
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
          { label: tb("projects"), href: "/projects" },
          {
            label: project?.name ?? tc("labels.project"),
            href: `/projects/${app.projectId}`,
          },
          { label: app.name },
        ]}
      />
      <div className="flex min-w-0 items-start gap-3">
        <Button asChild variant="ghost" size="icon" className="mt-0.5">
          <Link
            href={`/projects/${app.projectId}`}
            aria-label={t("page.backToProject")}
          >
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="flex min-w-0 items-center gap-2 text-lg font-semibold">
          <SourceIcon
            sourceType={app.sourceType}
            gitUrl={app.gitUrl}
            imageRef={app.imageRef}
            buildType={app.buildType}
            className="size-4 text-muted-foreground"
          />
          <span className="min-w-0 break-words">{app.name}</span>
        </h1>
      </div>

      <ApplicationTabs
        app={app}
        deployments={deployments}
        domains={domains}
        certificates={certificates}
        middlewareOptions={middlewareOptions}
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
        monitor={monitor}
        alerts={alerts}
        secretConnections={secretConnections}
        servers={servers}
        previews={previews}
        dnsConnections={dnsConnections}
        proxyDnsEnabled={dnsOptions.proxyDnsEnabled}
        canBind={canBind}
        swarmActive={swarm?.state === "active" && swarm.isManager}
        swarmNodes={swarm?.nodes ?? []}
        publicApiUrl={publicApiUrl()}
        webOrigin={webOrigin()}
        domainProxyAutoProvisioned={domainProxyAutoProvisioned === "1"}
        statusStrip={
          <StatusStrip
            className="pt-4"
            status={
              <>
                <Badge variant={running ? "default" : "secondary"}>
                  {app.container
                    ? app.container.state
                    : t("status.notDeployed")}
                </Badge>
                {app.maintenanceEnabled && (
                  <Badge variant="secondary">{t("status.maintenance")}</Badge>
                )}
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
                    {app.service.updateState &&
                    app.service.updateState !== "completed"
                      ? t("status.serviceUpdating", {
                          running: app.service.running,
                          desired: app.service.desired,
                          state: app.service.updateState,
                        })
                      : t("status.service", {
                          running: app.service.running,
                          desired: app.service.desired,
                        })}
                  </Badge>
                )}
              </>
            }
            info={
              <span className="font-mono break-all">
                {app.appName} ·{" "}
                {app.sourceType === "image"
                  ? app.imageRef
                  : `${app.gitUrl}#${app.gitBranch}${app.rootDirectory ? `:${app.rootDirectory}` : ""}`}
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
              </span>
            }
            actions={
              <>
                {app.projectRole !== "viewer" && (
                  <ApplicationStatusActions
                    app={app}
                    deployments={deployments}
                  />
                )}
                {app.projectRole === "viewer" ? (
                  <Badge variant="outline">{t("page.readOnly")}</Badge>
                ) : (
                  <DeleteApplicationButton
                    id={app.id}
                    projectId={app.projectId}
                    name={app.name}
                  />
                )}
              </>
            }
          />
        }
      />
    </>
  )
}
