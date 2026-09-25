import { ArrowLeft } from "lucide-react"
import { getProject } from "@/features/project/project.queries"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ApplicationJobs } from "@/components/custom/application-jobs"
import { ApplicationMounts } from "@/components/custom/application-mounts"
import { DatabaseBackups } from "@/components/custom/database-backups"
import { DatabaseDataBrowser } from "@/components/custom/database-data-browser"
import { DatabasePanel } from "@/components/custom/database-panel"
import { DatabaseResources } from "@/components/custom/database-resources"
import { MetricsPanel } from "@/components/custom/metrics-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { listBackupDestinations } from "@/features/backup-destination/backup-destination.queries"
import { listMounts } from "@/features/application/application.queries"
import { listJobs } from "@/features/job/job.queries"
import { fetchMetricsAction } from "@/features/monitoring/monitoring.actions"
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
  ] = await Promise.all([
    getDatabaseCredentials(db.id),
    listBackups(db.id),
    fetchMetricsAction("database", db.id),
    listBackupDestinations(),
    getVerifiedSession(),
    // Needs the server up (runs a query); skip otherwise to keep the page fast.
    running && db.engine !== "redis" ? listSchemas(db.id) : [],
    listMounts({ kind: "database", id: db.id }),
    listJobs({ kind: "database", id: db.id }),
  ])
  // Same roles that may write through the data browser / add bind mounts (owner/admin).
  const canWrite = session ? canUseTerminal(session.user) : false

  const project = await getProject(db.projectId)
  return (
    <>
      <SetBreadcrumb
        items={[
          { label: "Projects", href: "/projects" },
          {
            label: project?.name ?? "Project",
            href: `/projects/${db.projectId}`,
          },
          { label: db.name },
        ]}
      />
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon" className="mt-0.5">
          <Link
            href={`/projects/${db.projectId}`}
            aria-label="Kembali ke project"
          >
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{db.name}</h1>
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
                ? "creating…"
                : (db.container?.state ?? db.status)}
            </Badge>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {ENGINE_LABEL[db.engine]} {db.imageTag} · {db.slug}
          </p>
        </div>
      </div>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Ringkasan</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="backups">Backup ({backups.length})</TabsTrigger>
          <TabsTrigger value="mounts">Mount ({mounts.length})</TabsTrigger>
          <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4 pt-4">
          <MetricsPanel
            target="database"
            id={db.id}
            initial={metrics}
            running={running}
          />
          <DatabasePanel db={db} connection={connection} schemas={schemas} />
          <DatabaseResources db={db} />
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
