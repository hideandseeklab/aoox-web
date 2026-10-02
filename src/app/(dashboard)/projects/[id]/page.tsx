import {
  ArrowLeft,
  Boxes,
  Database,
  Layers,
  LayoutTemplate,
  Plus,
} from "lucide-react"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DeleteProjectButton } from "@/components/custom/delete-project-button"
import { ExportProjectButton } from "@/components/custom/export-project-button"
import { ProjectForm } from "@/components/custom/project-form"
import { ProjectMembers } from "@/components/custom/project-members"
import {
  ApplicationInstanceCard,
  ComposeInstanceCard,
  DatabaseInstanceCard,
} from "@/components/custom/project-instance-card"
import { ProjectResourcePanel } from "@/components/custom/project-resource-panel"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getProxyStatus } from "@/features/proxy/proxy.queries"
import { listApplications } from "@/features/application/application.queries"
import { listComposeApps } from "@/features/compose/compose.queries"
import { listDatabases } from "@/features/managed-database/managed-database.queries"
import { updateProjectAction } from "@/features/project/project.actions"
import {
  getProject,
  getProjectResourceUsage,
} from "@/features/project/project.queries"
import { listProjectMembers } from "@/features/project-member/project-member.queries"
import { getSession } from "@/features/auth/auth.session"

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) notFound()

  const updateAction = updateProjectAction.bind(null, project.id)
  // Viewers read; developers/admins may create and edit (API enforces it too).
  const [
    applications,
    databases,
    composeApps,
    session,
    members,
    resourceUsage,
    proxyStatus,
  ] = await Promise.all([
    listApplications(project.id),
    listDatabases(project.id),
    listComposeApps(project.id),
    getSession(),
    listProjectMembers(project.id).catch(() => null),
    getProjectResourceUsage(project.id).catch(() => ({
      current: null,
      history: [],
      containers: 0,
    })),
    // Only for the port of a domain link (dev proxies listen on 8088/8443).
    getProxyStatus().catch(() => null),
  ])
  const proxy = proxyStatus
    ? { httpPort: proxyStatus.httpPort, httpsPort: proxyStatus.httpsPort }
    : null
  const canWrite = members ? members.myRole !== "viewer" : true

  return (
    <>
      <SetBreadcrumb
        items={[
          { label: "Projects", href: "/projects" },
          { label: project.name },
        ]}
      />
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-start gap-3">
          <Button asChild variant="ghost" size="icon" className="mt-0.5">
            <Link href="/projects" aria-label="Kembali ke projects">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold break-words">
              {project.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Dibuat{" "}
              {new Date(project.createdAt).toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportProjectButton
            id={project.id}
            canExportSecrets={session?.user.role === "owner"}
          />
          {members?.myRole === "admin" && (
            <DeleteProjectButton id={project.id} name={project.name} />
          )}
        </div>
      </div>

      {/* Resources on the left, project settings on the right (stacked on small screens). */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-medium">Resource usage</h2>
            <ProjectResourcePanel
              projectId={project.id}
              initial={resourceUsage}
            />
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Aplikasi</h2>
              {canWrite && (
                <Button asChild size="sm">
                  <Link href={`/projects/${project.id}/applications/new`}>
                    <Plus data-icon="inline-start" />
                    New application
                  </Link>
                </Button>
              )}
            </div>
            {applications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
                <Boxes className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Belum ada aplikasi di project ini.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {applications.map((app) => (
                  <ApplicationInstanceCard
                    key={app.id}
                    app={app}
                    proxy={proxy}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Stack compose</h2>
              {canWrite && (
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/templates?project=${project.id}`}>
                      <LayoutTemplate data-icon="inline-start" />
                      Dari template
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/projects/${project.id}/compose/new`}>
                      <Plus data-icon="inline-start" />
                      Stack compose
                    </Link>
                  </Button>
                </div>
              )}
            </div>
            {composeApps.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
                <Layers className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Belum ada stack compose di project ini.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {composeApps.map((c) => (
                  <ComposeInstanceCard key={c.id} stack={c} proxy={proxy} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Database</h2>
              {canWrite && (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/projects/${project.id}/databases/new`}>
                    <Plus data-icon="inline-start" />
                    New database
                  </Link>
                </Button>
              )}
            </div>
            {databases.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
                <Database className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Belum ada database di project ini.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {databases.map((db) => (
                  <DatabaseInstanceCard key={db.id} db={db} />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6 lg:sticky lg:top-6">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan</CardTitle>
              <CardDescription>
                Nama, deskripsi, dan environment bersama untuk semua aplikasi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectForm
                action={updateAction}
                defaultValues={{
                  name: project.name,
                  description: project.description ?? "",
                  env: project.env,
                }}
                submitLabel="Simpan"
                showEnv
              />
            </CardContent>
          </Card>
          {members && <ProjectMembers projectId={project.id} data={members} />}
        </div>
      </div>
    </>
  )
}
