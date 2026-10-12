import {
  Boxes,
  Database,
  FolderKanban,
  Layers,
  LayoutTemplate,
  Plus,
} from "lucide-react"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DangerZone } from "@/components/custom/danger-zone"
import { DeleteProjectButton } from "@/components/custom/delete-project-button"
import { ResourceHeader } from "@/components/custom/resource-header"
import { ExportProjectButton } from "@/components/custom/export-project-button"
import { ProjectForm } from "@/components/custom/project-form"
import { ProjectMembers } from "@/components/custom/project-members"
import {
  ApplicationInstanceCard,
  ComposeInstanceCard,
  DatabaseInstanceCard,
} from "@/components/custom/project-instance-card"
import { ProjectResourcePanel } from "@/components/custom/project-resource-panel"
import { EmptyState } from "@/components/custom/empty-state"
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
import { formatDateTime } from "@/i18n/format"
import { getLocale, getTranslations } from "next-intl/server"

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const locale = await getLocale()
  const t = await getTranslations("projects")
  const tc = await getTranslations("common")
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
          { label: t("list.title"), href: "/projects" },
          { label: project.name },
        ]}
      />
      <ResourceHeader
        backHref="/projects"
        backLabel={t("detail.backToProjects")}
        icon={<FolderKanban className="size-5" />}
        title={project.name}
        meta={[
          t("detail.counts", {
            apps: applications.length,
            stacks: composeApps.length,
            dbs: databases.length,
          }),
          t("detail.created", {
            date: formatDateTime(project.createdAt, locale, {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          }),
        ]}
        actions={
          <ExportProjectButton
            id={project.id}
            canExportSecrets={session?.user.role === "owner"}
          />
        }
      />

      {/* Resources on the left, project settings on the right (stacked on small screens). */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-medium">{t("detail.sections.resourceUsage")}</h2>
            <ProjectResourcePanel
              projectId={project.id}
              initial={resourceUsage}
            />
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">{t("detail.sections.applications")}</h2>
              {canWrite && (
                <Button asChild size="sm">
                  <Link href={`/projects/${project.id}/applications/new`}>
                    <Plus data-icon="inline-start" />
                    {t("detail.newApplication")}
                  </Link>
                </Button>
              )}
            </div>
            {applications.length === 0 ? (
              <EmptyState
                icon={Boxes}
                action={
                  canWrite && (
                    <Button asChild size="sm">
                      <Link href={`/projects/${project.id}/applications/new`}>
                        <Plus data-icon="inline-start" />
                        {t("detail.newApplication")}
                      </Link>
                    </Button>
                  )
                }
              >
                {t("detail.empty.applications")}
              </EmptyState>
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
              <h2 className="text-sm font-medium">{t("detail.sections.compose")}</h2>
              {canWrite && (
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/templates?project=${project.id}`}>
                      <LayoutTemplate data-icon="inline-start" />
                      {t("detail.fromTemplate")}
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/projects/${project.id}/compose/new`}>
                      <Plus data-icon="inline-start" />
                      {t("detail.composeStack")}
                    </Link>
                  </Button>
                </div>
              )}
            </div>
            {composeApps.length === 0 ? (
              <EmptyState
                icon={Layers}
                action={
                  canWrite && (
                    <Button asChild size="sm">
                      <Link href={`/projects/${project.id}/compose/new`}>
                        <Plus data-icon="inline-start" />
                        {t("detail.composeStack")}
                      </Link>
                    </Button>
                  )
                }
              >
                {t("detail.empty.compose")}
              </EmptyState>
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
              <h2 className="text-sm font-medium">{t("detail.sections.databases")}</h2>
              {canWrite && (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/projects/${project.id}/databases/new`}>
                    <Plus data-icon="inline-start" />
                    {t("detail.newDatabase")}
                  </Link>
                </Button>
              )}
            </div>
            {databases.length === 0 ? (
              <EmptyState
                icon={Database}
                action={
                  canWrite && (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/projects/${project.id}/databases/new`}>
                        <Plus data-icon="inline-start" />
                        {t("detail.newDatabase")}
                      </Link>
                    </Button>
                  )
                }
              >
                {t("detail.empty.databases")}
              </EmptyState>
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
              <CardTitle>{t("detail.settings.title")}</CardTitle>
              <CardDescription>
                {t("detail.settings.description")}
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
                submitLabel={tc("actions.save")}
                showEnv
                readOnly={!canWrite}
              />
            </CardContent>
          </Card>
          {members && <ProjectMembers projectId={project.id} data={members} />}
          {members?.myRole === "admin" && (
            <DangerZone
              title={t("detail.dangerZone.title")}
              description={t("detail.dangerZone.description")}
              items={[
                {
                  title: t("detail.dangerZone.deleteTitle"),
                  description: t("detail.dangerZone.deleteDescription"),
                  action: (
                    <DeleteProjectButton id={project.id} name={project.name} />
                  ),
                },
              ]}
            />
          )}
        </div>
      </div>
    </>
  )
}
