import {
  ArrowLeft,
  Boxes,
  Database,
  Layers,
  LayoutTemplate,
} from "lucide-react"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CreateApplicationDialog } from "@/components/custom/create-application-dialog"
import { CreateComposeDialog } from "@/components/custom/create-compose-dialog"
import { CreateDatabaseDialog } from "@/components/custom/create-database-dialog"
import { DeleteProjectButton } from "@/components/custom/delete-project-button"
import { ExportProjectButton } from "@/components/custom/export-project-button"
import { ProjectForm } from "@/components/custom/project-form"
import { ProjectMembers } from "@/components/custom/project-members"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { listApplications } from "@/features/application/application.queries"
import { listComposeApps } from "@/features/compose/compose.queries"
import { listServers } from "@/features/server/server.queries"
import { listGitCredentials } from "@/features/git-credential/git-credential.queries"
import { listRegistries } from "@/features/registry/registry.queries"
import { ENGINE_LABEL } from "@/features/managed-database/managed-database.entity"
import { listDatabases } from "@/features/managed-database/managed-database.queries"
import { updateProjectAction } from "@/features/project/project.actions"
import { getProject } from "@/features/project/project.queries"
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
    credentials,
    databases,
    composeApps,
    servers,
    registries,
    session,
    members,
  ] = await Promise.all([
    listApplications(project.id),
    listGitCredentials(),
    listDatabases(project.id),
    listComposeApps(project.id),
    // Members get 403 here; they can still create apps on the host.
    listServers().catch(() => []),
    listRegistries().catch(() => []),
    getSession(),
    listProjectMembers(project.id).catch(() => null),
  ])
  const canWrite = members ? members.myRole !== "viewer" : true

  return (
    <>
      <SetBreadcrumb
        items={[
          { label: "Projects", href: "/projects" },
          { label: project.name },
        ]}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon" className="mt-0.5">
            <Link href="/projects" aria-label="Kembali ke projects">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">
              Dibuat{" "}
              {new Date(project.createdAt).toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
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
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Aplikasi</h2>
              {canWrite && (
                <CreateApplicationDialog
                  projectId={project.id}
                  credentials={credentials}
                  servers={servers}
                  registries={registries}
                />
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
                  <Link key={app.id} href={`/applications/${app.id}`}>
                    <Card className="h-full transition-colors hover:bg-muted/50">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="truncate">{app.name}</CardTitle>
                          <Badge
                            variant={
                              app.status === "running"
                                ? "default"
                                : app.status === "error"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {app.status}
                          </Badge>
                        </div>
                        <CardDescription className="truncate font-mono text-xs">
                          {app.sourceType === "image"
                            ? `image · ${app.imageRef ?? ""}`
                            : `${(app.gitUrl ?? "").replace(/^https?:\/\//, "")}#${app.gitBranch}`}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
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
                  <CreateComposeDialog
                    projectId={project.id}
                    credentials={credentials}
                    databaseSlugs={databases.map((d) => d.slug)}
                  />
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
                  <Link key={c.id} href={`/compose/${c.id}`}>
                    <Card className="h-full transition-colors hover:bg-muted/50">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="truncate">{c.name}</CardTitle>
                          <Badge
                            variant={
                              c.status === "running"
                                ? "default"
                                : c.status === "error"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {c.status === "deploying" ? "berjalan…" : c.status}
                          </Badge>
                        </div>
                        <CardDescription className="truncate font-mono text-xs">
                          {c.source === "template"
                            ? `template · ${c.templateId}`
                            : `${(c.gitUrl ?? "").replace(/^https?:\/\//, "")}#${c.gitBranch} · ${c.composePath}`}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Database</h2>
              {canWrite && <CreateDatabaseDialog projectId={project.id} />}
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
                  <Link key={db.id} href={`/databases/${db.id}`}>
                    <Card className="h-full transition-colors hover:bg-muted/50">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="truncate">{db.name}</CardTitle>
                          <Badge
                            variant={
                              db.status === "running"
                                ? "default"
                                : db.status === "error"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {db.status}
                          </Badge>
                        </div>
                        <CardDescription className="font-mono text-xs">
                          {ENGINE_LABEL[db.engine]} {db.imageTag}
                          {db.hostPort ? ` · :${db.hostPort}` : ""}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
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
