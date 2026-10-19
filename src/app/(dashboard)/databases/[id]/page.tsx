import {
  LayoutDashboard,
  Table2,
  ArchiveRestore,
  HardDrive,
  Timer,
} from "lucide-react"
import { getProject } from "@/features/project/project.queries"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"
import { EngineIcon } from "@/components/custom/brand-icon"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { ApplicationJobs } from "@/components/custom/application-jobs"
import { ApplicationMounts } from "@/components/custom/application-mounts"
import { DatabaseCompanionCard } from "@/components/custom/database-companion"
import { DatabaseBackups } from "@/components/custom/database-backups"
import { DatabaseDataBrowser } from "@/components/custom/database-data-browser"
import {
  DatabasePanel,
  DatabaseStartStop,
} from "@/components/custom/database-panel"
import { DatabaseResources } from "@/components/custom/database-resources"
import { DangerZone } from "@/components/custom/danger-zone"
import { DeleteDatabaseButton } from "@/components/custom/delete-database-button"
import { cn } from "@/lib/utils"
import { MetricsPanel } from "@/components/custom/metrics-panel"
import {
  ResourceHeader,
  ResourceStatus,
} from "@/components/custom/resource-header"
import { ContainerName } from "@/components/custom/container-name"
import { HeaderFact } from "@/components/custom/header-fact"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { ScrollableTabsList } from "@/components/custom/scrollable-tabs-list"
import { PageTabsTrigger } from "@/components/custom/page-tabs-trigger"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { listBackupDestinations } from "@/features/backup-destination/backup-destination.queries"
import { listMounts } from "@/features/application/application.queries"
import {
  getCompanion,
  listCompanionOptions,
} from "@/features/database-companion/database-companion.queries"
import { listJobs } from "@/features/job/job.queries"
import { fetchMetricsAction } from "@/features/monitoring/monitoring.actions"
import { getResourceAlerts } from "@/features/resource-alert/resource-alert.queries"
import { ResourceAlertsCard } from "@/components/custom/resource-alerts-card"
import {
  ENGINE_CONTAINER_PORT,
  ENGINE_LABEL,
} from "@/features/managed-database/managed-database.entity"
import {
  getDatabase,
  getDatabaseCredentials,
  listSchemas,
  listBackups,
} from "@/features/managed-database/managed-database.queries"

export default async function DatabasePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const t = await getTranslations("database")
  const tb = await getTranslations("breadcrumb")
  const tc = await getTranslations("common")
  const db = await getDatabase(id)
  if (!db) notFound()
  const running = db.container?.state === "running"
  const [
    connection,
    backups,
    metrics,
    destinations,
    session,
    schemas,
    mounts,
    jobs,
    companion,
    companionTools,
    alerts,
  ] = await Promise.all([
    getDatabaseCredentials(db.id),
    listBackups(db.id),
    fetchMetricsAction("database", db.id),
    listBackupDestinations(),
    getVerifiedSession(),
    // Needs the server up (runs a query); skip otherwise to keep the page fast.
    running && db.engine !== "redis" && db.engine !== "valkey"
      ? listSchemas(db.id)
      : [],
    listMounts({ kind: "database", id: db.id }),
    listJobs({ kind: "database", id: db.id }),
    getCompanion(db.id),
    listCompanionOptions(db.id),
    getResourceAlerts("database", db.id).catch(() => null),
  ])
  // Same roles that may write through the data browser / add bind mounts (owner/admin).
  const canWrite = session ? canUseTerminal(session.user) : false

  const project = await getProject(db.projectId)
  return (
    <>
      <SetBreadcrumb
        items={[
          { label: tb("projects"), href: "/projects" },
          {
            label: project?.name ?? t("page.projectFallback"),
            href: `/projects/${db.projectId}`,
          },
          { label: db.name },
        ]}
      />
      <ResourceHeader
        backHref={`/projects/${db.projectId}`}
        backLabel={t("page.backToProject")}
        icon={<EngineIcon engine={db.engine} className="size-5" />}
        title={db.name}
        badges={
          <>
            <ResourceStatus
              tone={
                db.status === "creating"
                  ? "warning"
                  : db.status === "error"
                    ? "danger"
                    : running
                      ? "success"
                      : "neutral"
              }
            >
              {db.status === "creating"
                ? t("status.creating")
                : t.has(`status.${db.container?.state ?? db.status}`)
                  ? t(`status.${db.container?.state ?? db.status}`)
                  : (db.container?.state ?? db.status)}
            </ResourceStatus>
            {db.projectRole === "viewer" && (
              <Badge variant="outline">{t("page.readOnly")}</Badge>
            )}
          </>
        }
        meta={[
          <HeaderFact key="e" label={t("page.image")}>
            <span className="font-mono">
              {ENGINE_LABEL[db.engine]} {db.imageTag}
            </span>
          </HeaderFact>,
          <HeaderFact key="s" label={t("page.container")}>
            <ContainerName
              name={`aoox-db-${db.slug}`}
              label={t("page.containerName")}
              hint={t("page.containerHint", {
                name: `aoox-db-${db.slug}`,
                port: ENGINE_CONTAINER_PORT[db.engine],
              })}
            />
          </HeaderFact>,
          db.hostPort && (
            <HeaderFact key="p" label={t("page.port")}>
              <span className="font-mono">{db.hostPort}</span>
              {db.hostPortBind === "loopback" && (
                <span className="ms-1 text-muted-foreground">
                  · {tc("hostPortBind.shortLoopback")}
                </span>
              )}
            </HeaderFact>
          ),
        ]}
        actions={db.projectRole !== "viewer" && <DatabaseStartStop db={db} />}
      />
      <Tabs defaultValue="overview">
        <ScrollableTabsList>
          <PageTabsTrigger icon={LayoutDashboard} value="overview">
            {t("page.tabs.overview")}
          </PageTabsTrigger>
          <PageTabsTrigger icon={Table2} value="data">
            {t("page.tabs.data")}
          </PageTabsTrigger>
          <PageTabsTrigger icon={ArchiveRestore} value="backups">
            {t("page.tabs.backups", { count: backups.length })}
          </PageTabsTrigger>
          <PageTabsTrigger icon={HardDrive} value="mounts">
            {t("page.tabs.mounts", { count: mounts.length })}
          </PageTabsTrigger>
          <PageTabsTrigger icon={Timer} value="jobs">
            {t("page.tabs.jobs", { count: jobs.length })}
          </PageTabsTrigger>
        </ScrollableTabsList>
        <TabsContent value="overview" className="space-y-4 pt-4">
          <MetricsPanel
            target="database"
            id={db.id}
            initial={metrics}
            running={running}
          />
          <DatabasePanel
            db={db}
            connection={connection}
            schemas={schemas}
            canManageDatabases={
              canWrite &&
              running &&
              db.engine !== "redis" &&
              db.engine !== "valkey"
            }
          />
          <DatabaseCompanionCard
            db={db}
            companion={companion}
            tools={companionTools}
            running={running}
          />
          <div
            className={cn("grid items-start gap-4", alerts && "lg:grid-cols-2")}
          >
            <DatabaseResources db={db} />
            {alerts && (
              <ResourceAlertsCard
                kind="database"
                id={db.id}
                initial={alerts}
                canEdit={db.projectRole !== "viewer"}
              />
            )}
          </div>
          {db.projectRole !== "viewer" && (
            <DangerZone
              title={t("dangerZone.title")}
              description={t("dangerZone.description")}
              items={[
                {
                  title: t("dangerZone.deleteTitle"),
                  description: t("dangerZone.deleteDescription"),
                  action: (
                    <DeleteDatabaseButton
                      id={db.id}
                      projectId={db.projectId}
                      name={db.name}
                    />
                  ),
                },
              ]}
            />
          )}
        </TabsContent>
        <TabsContent value="data" className="pt-4">
          <DatabaseDataBrowser
            db={db}
            running={running}
            canWrite={canWrite}
            canQuery={db.projectRole !== "viewer"}
          />
        </TabsContent>
        <TabsContent value="mounts" className="pt-4">
          <ApplicationMounts
            owner={{ kind: "database", id: db.id }}
            mounts={mounts}
            canBind={canWrite}
            canEdit={db.projectRole !== "viewer"}
          />
        </TabsContent>
        <TabsContent value="jobs" className="pt-4">
          <ApplicationJobs
            owner={{ kind: "database", id: db.id }}
            jobs={jobs}
            canEdit={db.projectRole !== "viewer"}
          />
        </TabsContent>
        <TabsContent value="backups" className="pt-4">
          <DatabaseBackups
            db={db}
            backups={backups}
            running={running}
            destinations={destinations}
          />
        </TabsContent>
      </Tabs>
    </>
  )
}
