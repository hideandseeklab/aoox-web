import { ArrowLeft } from "lucide-react"
import { getProject } from "@/features/project/project.queries"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"
import { EngineIcon } from "@/components/custom/brand-icon"
import Link from "next/link"
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
import { MetricsPanel } from "@/components/custom/metrics-panel"
import { StatusStrip } from "@/components/custom/status-strip"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs"
import { ScrollableTabsList } from "@/components/custom/scrollable-tabs-list"
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
import { ENGINE_LABEL } from "@/features/managed-database/managed-database.entity"
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
      <div className="flex min-w-0 items-start gap-3">
        <Button asChild variant="ghost" size="icon" className="mt-0.5">
          <Link
            href={`/projects/${db.projectId}`}
            aria-label={t("page.backToProject")}
          >
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="flex min-w-0 items-center gap-2 text-lg font-semibold">
          <EngineIcon
            engine={db.engine}
            className="size-4 text-muted-foreground"
          />
          <span className="min-w-0 break-words">{db.name}</span>
        </h1>
      </div>
      <Tabs defaultValue="overview">
        <ScrollableTabsList>
          <TabsTrigger value="overview">{t("page.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="data">{t("page.tabs.data")}</TabsTrigger>
          <TabsTrigger value="backups">
            {t("page.tabs.backups", { count: backups.length })}
          </TabsTrigger>
          <TabsTrigger value="mounts">
            {t("page.tabs.mounts", { count: mounts.length })}
          </TabsTrigger>
          <TabsTrigger value="jobs">
            {t("page.tabs.jobs", { count: jobs.length })}
          </TabsTrigger>
        </ScrollableTabsList>
        <StatusStrip
          className="pt-4"
          status={
            <Badge
              variant={
                db.status === "creating"
                  ? "secondary"
                  : db.status === "error"
                    ? "destructive"
                    : running
                      ? "default"
                      : "secondary"
              }
            >
              {db.status === "creating"
                ? t("status.creating")
                : t.has(`status.${db.container?.state ?? db.status}`)
                  ? t(`status.${db.container?.state ?? db.status}`)
                  : (db.container?.state ?? db.status)}
            </Badge>
          }
          info={
            <span className="font-mono break-all">
              {ENGINE_LABEL[db.engine]} {db.imageTag} · {db.slug}
            </span>
          }
          actions={
            db.projectRole === "viewer" ? (
              <Badge variant="outline">{t("page.readOnly")}</Badge>
            ) : (
              <DatabaseStartStop db={db} />
            )
          }
        />
        <TabsContent value="overview" className="space-y-4 pt-4">
          <MetricsPanel
            target="database"
            id={db.id}
            initial={metrics}
            running={running}
          />
          {alerts && (
            <ResourceAlertsCard
              kind="database"
              id={db.id}
              initial={alerts}
              canEdit={db.projectRole !== "viewer"}
            />
          )}
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
          <DatabaseResources db={db} />
          <DatabaseCompanionCard
            db={db}
            companion={companion}
            tools={companionTools}
            running={running}
          />
        </TabsContent>
        <TabsContent value="data" className="pt-4">
          <DatabaseDataBrowser db={db} running={running} canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="mounts" className="pt-4">
          <ApplicationMounts
            owner={{ kind: "database", id: db.id }}
            mounts={mounts}
            canBind={canWrite}
          />
        </TabsContent>
        <TabsContent value="jobs" className="pt-4">
          <ApplicationJobs
            owner={{ kind: "database", id: db.id }}
            jobs={jobs}
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
