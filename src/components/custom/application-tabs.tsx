"use client"

import { useState } from "react"
import { ApplicationDeployPanel } from "@/components/custom/application-deploy-panel"
import { ApplicationDomains } from "@/components/custom/application-domains"
import { ApplicationForm } from "@/components/custom/application-form"
import { ApplicationJobs } from "@/components/custom/application-jobs"
import { ApplicationMounts } from "@/components/custom/application-mounts"
import { ApplicationWebhook } from "@/components/custom/application-webhook"
import { ConsoleView } from "@/components/custom/console-view"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { updateApplicationAction } from "@/features/application/application.actions"
import type {
  ApplicationDetail,
  DeploymentSummary,
  Domain,
  Mount,
  WebhookInfo,
} from "@/features/application/application.entity"
import type { PreviewDeployment } from "@/features/application/preview.entity"
import type { BackupDestination } from "@/features/backup-destination/backup-destination.entity"
import type { GitCredential } from "@/features/git-credential/git-credential.entity"
import type { Job } from "@/features/job/job.entity"
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
  | "jobs"
  | "webhook"
  | "console"
  | "settings"

/**
 * The Deploy tab's post-deploy nudge needs to switch to Pengaturan/Domain
 * from a button click, so the tab value is lifted here (a client component)
 * instead of being an uncontrolled `<Tabs defaultValue>` in the server page.
 */
export function ApplicationTabs({
  app,
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
  databaseSlugs,
  metrics,
  servers,
  previews,
  canBind,
  swarmActive,
  swarmNodes,
  publicApiUrl,
  webOrigin,
  domainProxyAutoProvisioned,
}: {
  app: ApplicationDetail
  deployments: DeploymentSummary[]
  domains: Domain[]
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
  servers: Server[]
  previews: PreviewDeployment[]
  canBind: boolean
  swarmActive: boolean
  swarmNodes: SwarmNode[]
  publicApiUrl: string
  webOrigin: string
  /** Came from the create dialog's "Domain" option; see applications/[id]/page.tsx. */
  domainProxyAutoProvisioned: boolean
}) {
  const [tab, setTab] = useState<ApplicationTab>("deploy")
  const running = app.container?.state === "running"
  // Console is developer+ (see AGENTS.md "Console container") — the API
  // enforces this too, but hiding the tab keeps a viewer from hitting a 403.
  const canUseConsole = app.projectRole !== "viewer"

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as ApplicationTab)}>
      <TabsList>
        <TabsTrigger value="deploy">Deploy</TabsTrigger>
        <TabsTrigger value="domains">Domain ({domains.length})</TabsTrigger>
        <TabsTrigger value="mounts">Mount ({mounts.length})</TabsTrigger>
        <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
        <TabsTrigger value="webhook">Webhook</TabsTrigger>
        {canUseConsole && <TabsTrigger value="console">Console</TabsTrigger>}
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
        <ApplicationJobs owner={{ kind: "application", id: app.id }} jobs={jobs} />
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
      {canUseConsole && (
        <TabsContent value="console" className="pt-4">
          <Card className="h-[600px]">
            <CardContent className="h-full p-4">
              <ConsoleView
                applicationId={app.id}
                publicApiUrl={publicApiUrl}
                webOrigin={webOrigin}
                tasks={app.service?.tasks
                  .filter((t) => t.local && t.state === "running" && t.containerId)
                  .map((t) => ({
                    containerId: t.containerId as string,
                    label: `Task ${t.slot ?? "?"}${t.node ? ` · ${t.node}` : ""}`,
                  }))}
              />
            </CardContent>
          </Card>
        </TabsContent>
      )}
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
                cpuMillicores: app.cpuMillicores ? String(app.cpuMillicores) : "",
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
              submitLabel="Simpan"
              credentials={credentials}
              registries={registries}
              databaseSlugs={databaseSlugs}
              servers={servers}
              swarmActive={swarmActive}
              swarmNodes={swarmNodes}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
