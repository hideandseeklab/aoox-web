"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { ApplicationDeployPanel } from "@/components/custom/application-deploy-panel"
import { ApplicationDomains } from "@/components/custom/application-domains"
import { ApplicationForm } from "@/components/custom/application-form"
import { ApplicationJobs } from "@/components/custom/application-jobs"
import { ApplicationMounts } from "@/components/custom/application-mounts"
import { ApplicationWebhook } from "@/components/custom/application-webhook"
import { ConsoleView } from "@/components/custom/console-view"
import { ApplicationEnvironment } from "@/components/custom/application-environment"
import { ApplicationSecretSource } from "@/components/custom/application-secret-source"
import { ApplicationMonitor } from "@/components/custom/application-monitor"
import { ApplicationMaintenance } from "@/components/custom/application-maintenance"
import { ResourceAlertsCard } from "@/components/custom/resource-alerts-card"
import type { DnsConnection } from "@/features/dns/dns.entity"
import type { ResourceAlertsView } from "@/features/resource-alert/resource-alert.entity"
import { MetricsPanel } from "@/components/custom/metrics-panel"
import { PreviewsPanel } from "@/components/custom/previews-panel"
import { VolumeBackups } from "@/components/custom/volume-backups"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { ScrollableTabsList } from "@/components/custom/scrollable-tabs-list"
import { PageTabsTrigger } from "@/components/custom/page-tabs-trigger"
import {
  Rocket,
  Globe,
  HardDrive,
  KeyRound,
  Timer,
  Activity,
  Webhook,
  SquareTerminal,
  Settings,
} from "lucide-react"
import { updateApplicationAction } from "@/features/application/application.actions"
import type {
  ApplicationDetail,
  DeploymentSummary,
  Domain,
  DomainMiddlewareOption,
  Mount,
  WebhookInfo,
} from "@/features/application/application.entity"
import type { PreviewDeployment } from "@/features/application/preview.entity"
import type { BackupDestination } from "@/features/backup-destination/backup-destination.entity"
import type { Certificate } from "@/features/certificate/certificate.entity"
import type { GitCredential } from "@/features/git-credential/git-credential.entity"
import type { Job } from "@/features/job/job.entity"
import type { HttpMonitorView } from "@/features/http-monitor/http-monitor.entity"
import type { SecretConnection } from "@/features/secret-connection/secret-connection.entity"
import type { MetricsResponse } from "@/features/monitoring/monitoring.entity"
import type { ProxyStatus } from "@/features/proxy/proxy.entity"
import type { Registry } from "@/features/registry/registry.entity"
import type { Server } from "@/features/server/server.entity"
import type { SwarmNode } from "@/features/swarm/swarm.entity"
import type { VolumeBackup } from "@/features/volume-backup/volume-backup.entity"

export type ApplicationTab =
  | "deploy"
  | "domains"
  | "mounts"
  | "environment"
  | "jobs"
  | "monitor"
  | "webhook"
  | "console"
  | "settings"

/**
 * The Deploy tab's post-deploy nudge needs to switch to Settings/Domain
 * from a button click, so the tab value is lifted here (a client component)
 * instead of being an uncontrolled `<Tabs defaultValue>` in the server page.
 */
export function ApplicationTabs({
  app,
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
  databaseSlugs,
  metrics,
  monitor,
  alerts,
  secretConnections,
  servers,
  previews,
  dnsConnections,
  proxyDnsEnabled,
  canBind,
  swarmActive,
  swarmNodes,
  publicApiUrl,
  webOrigin,
  domainProxyAutoProvisioned,
  statusStrip,
}: {
  app: ApplicationDetail
  deployments: DeploymentSummary[]
  domains: Domain[]
  /** Custom SSL certificates a https domain can pick (no key material). */
  certificates: Certificate[]
  /** Middlewares a domain can pick (names only). */
  middlewareOptions: DomainMiddlewareOption[]
  mounts: Mount[]
  jobs: Job[]
  volumeBackups: VolumeBackup[]
  destinations: BackupDestination[]
  proxy: ProxyStatus
  webhook: WebhookInfo
  credentials: GitCredential[]
  registries: Registry[]
  databaseSlugs: string[]
  metrics: MetricsResponse
  /** null when the monitor could not be loaded: the tab is then hidden. */
  monitor: HttpMonitorView | null
  /** CPU / memory alert rules; null when they could not be loaded (older API). */
  alerts: ResourceAlertsView | null
  secretConnections: SecretConnection[]
  servers: Server[]
  previews: PreviewDeployment[]
  /** DNS provider connections a domain can use (names only). */
  dnsConnections: DnsConnection[]
  /** The proxy serving this app has DNS-01 (wildcard certificates). */
  proxyDnsEnabled: boolean
  canBind: boolean
  swarmActive: boolean
  swarmNodes: SwarmNode[]
  publicApiUrl: string
  webOrigin: string
  /** Came from the create dialog's "Domain" option; see applications/[id]/page.tsx. */
  domainProxyAutoProvisioned: boolean
  /** Status line shown under the tab list on every tab (rendered by the page). */
  statusStrip?: React.ReactNode
}) {
  const t = useTranslations("applications")
  const tc = useTranslations("common")
  const [tab, setTab] = useState<ApplicationTab>("deploy")
  const running = app.container?.state === "running"
  // Console is developer+ (see AGENTS.md "Console container") — the API
  // enforces this too, but hiding the tab keeps a viewer from hitting a 403.
  const canUseConsole = app.projectRole !== "viewer"
  const canEdit = app.projectRole !== "viewer"

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as ApplicationTab)}>
      <ScrollableTabsList>
        <PageTabsTrigger icon={Rocket} value="deploy">
          {t("tabs.deploy")}
        </PageTabsTrigger>
        <PageTabsTrigger icon={Globe} value="domains">
          {t("tabs.domains", { count: domains.length })}
        </PageTabsTrigger>
        <PageTabsTrigger icon={HardDrive} value="mounts">
          {t("tabs.mounts", { count: mounts.length })}
        </PageTabsTrigger>
        <PageTabsTrigger icon={KeyRound} value="environment">
          {t("tabs.environment")}
        </PageTabsTrigger>
        <PageTabsTrigger icon={Timer} value="jobs">
          {t("tabs.jobs", { count: jobs.length })}
        </PageTabsTrigger>
        {monitor && (
          <PageTabsTrigger icon={Activity} value="monitor">
            {t("tabs.monitor")}
          </PageTabsTrigger>
        )}
        <PageTabsTrigger icon={Webhook} value="webhook">
          {t("tabs.webhook")}
        </PageTabsTrigger>
        {canUseConsole && (
          <PageTabsTrigger icon={SquareTerminal} value="console">
            {t("tabs.console")}
          </PageTabsTrigger>
        )}
        <PageTabsTrigger icon={Settings} value="settings">
          {t("tabs.settings")}
        </PageTabsTrigger>
      </ScrollableTabsList>
      {statusStrip}
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
          publicApiUrl={publicApiUrl}
          webOrigin={webOrigin}
          hasAccess={!!app.hostPort || domains.length > 0}
          domainProxyAutoProvisioned={domainProxyAutoProvisioned}
          onNavigateTab={setTab}
        />
      </TabsContent>
      <TabsContent value="domains" className="pt-4">
        <ApplicationDomains
          applicationId={app.id}
          domains={domains}
          certificates={certificates}
          middlewareOptions={middlewareOptions}
          canEdit={canEdit}
          proxy={proxy}
          deployed={!!app.currentImage}
          dnsConnections={dnsConnections}
          proxyDnsEnabled={proxyDnsEnabled}
        />
      </TabsContent>
      <TabsContent value="mounts" className="pt-4">
        <ApplicationMounts
          owner={{ kind: "application", id: app.id }}
          mounts={mounts}
          canBind={canBind}
          canEdit={canEdit}
        />
        <div className="mt-4">
          <VolumeBackups
            app={app}
            mounts={mounts}
            backups={volumeBackups}
            destinations={destinations}
            canEdit={canEdit}
          />
        </div>
      </TabsContent>
      <TabsContent value="environment" className="space-y-4 pt-4">
        <ApplicationEnvironment
          applicationId={app.id}
          env={app.env}
          databaseSlugs={databaseSlugs}
          canEdit={canEdit}
        />
        <ApplicationSecretSource
          applicationId={app.id}
          source={app.secretSource ?? null}
          connections={secretConnections}
          canEdit={canEdit}
          canManageConnections={canBind}
        />
      </TabsContent>
      {monitor && (
        <TabsContent value="monitor" className="space-y-4 pt-4">
          <ApplicationMonitor
            applicationId={app.id}
            initial={monitor}
            canEdit={canEdit}
            running={running}
          />
          {alerts && (
            <ResourceAlertsCard
              kind="application"
              id={app.id}
              initial={alerts}
              canEdit={canEdit}
            />
          )}
        </TabsContent>
      )}
      <TabsContent value="jobs" className="pt-4">
        <ApplicationJobs
          owner={{ kind: "application", id: app.id }}
          jobs={jobs}
          canEdit={canEdit}
        />
      </TabsContent>
      <TabsContent value="webhook" className="pt-4">
        <div className="space-y-4">
          <ApplicationWebhook
            applicationId={app.id}
            webhook={webhook}
            canEdit={canEdit}
          />
          <PreviewsPanel
            applicationId={app.id}
            enabled={app.previewsEnabled}
            initial={previews}
            proxyHttpPort={proxy.httpPort}
            previewDomain={app.previewDomain}
            wildcardCert={app.previewWildcardCert ?? false}
            proxyDnsEnabled={proxyDnsEnabled}
            canEdit={canEdit}
          />
        </div>
      </TabsContent>
      {canUseConsole && (
        <TabsContent value="console" className="pt-4">
          <Card className="h-[600px]">
            <CardContent className="h-full p-4">
              <ConsoleView
                applicationId={app.id}
                publicApiUrl={publicApiUrl}
                webOrigin={webOrigin}
                tasks={app.service?.tasks
                  .filter(
                    (task) =>
                      task.local && task.state === "running" && task.containerId
                  )
                  .map((task) => ({
                    containerId: task.containerId as string,
                    label: task.node
                      ? t("tabs.taskLabelNode", {
                          slot: task.slot ?? "?",
                          node: task.node,
                        })
                      : t("tabs.taskLabel", { slot: task.slot ?? "?" }),
                  }))}
              />
            </CardContent>
          </Card>
        </TabsContent>
      )}
      <TabsContent value="settings" className="space-y-4 pt-4">
        <ApplicationMaintenance
          applicationId={app.id}
          enabled={app.maintenanceEnabled}
          message={app.maintenanceMessage}
          canEdit={canEdit}
          remote={!!app.serverId}
        />
        <Card>
          <CardHeader>
            <CardTitle>{t("tabs.settingsTitle")}</CardTitle>
            <CardDescription className="max-w-3xl">
              {t("tabs.settingsDescription")}
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
                rootDirectory: app.rootDirectory ?? "",
                watchRootOnly: app.watchRootOnly ? "on" : "",
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
                ignoreErrorLogs: app.ignoreErrorLogs ? "on" : "",
              }}
              submitLabel={tc("actions.save")}
              hostPortApply={
                !app.currentImage
                  ? "next-deploy"
                  : app.status === "stopped"
                    ? "on-start"
                    : app.deployMode === "service"
                      ? "rolling"
                      : "recreate"
              }
              credentials={credentials}
              registries={registries}
              databaseSlugs={databaseSlugs}
              servers={servers}
              swarmActive={swarmActive}
              swarmNodes={swarmNodes}
              readOnly={!canEdit}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
