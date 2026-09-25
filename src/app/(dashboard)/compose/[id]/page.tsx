import { ArrowLeft } from "lucide-react"
import { getProject } from "@/features/project/project.queries"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ApplicationJobs } from "@/components/custom/application-jobs"
import { ComposeAccessHint } from "@/components/custom/compose-access-hint"
import { ComposeAccess } from "@/components/custom/compose-domains"
import { ComposeForm } from "@/components/custom/compose-form"
import { ComposeHistory } from "@/components/custom/compose-history"
import { ComposeMounts } from "@/components/custom/compose-mounts"
import { ComposePanel } from "@/components/custom/compose-panel"
import { ComposeResources } from "@/components/custom/compose-resources"
import { ComposeWebhook } from "@/components/custom/compose-webhook"
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
import { listMounts } from "@/features/application/application.queries"
import { updateComposeAppAction } from "@/features/compose/compose.actions"
import {
  getComposeApp,
  getComposeWebhook,
  listComposeDeployments,
} from "@/features/compose/compose.queries"
import { listJobs } from "@/features/job/job.queries"
import { listGitCredentials } from "@/features/git-credential/git-credential.queries"
import { listDatabases } from "@/features/managed-database/managed-database.queries"
import { fetchMetricsAction } from "@/features/monitoring/monitoring.actions"
import { getProxyStatus } from "@/features/proxy/proxy.queries"
import { listTemplates } from "@/features/template/template.queries"

export default async function ComposeAppPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const app = await getComposeApp(id)
  if (!app) notFound()
  const [
    credentials,
    databases,
    proxy,
    templates,
    jobs,
    runs,
    webhook,
    mounts,
    session,
    metrics,
  ] = await Promise.all([
    listGitCredentials(),
    listDatabases(app.projectId),
    getProxyStatus(),
    app.templateId ? listTemplates() : Promise.resolve([]),
    listJobs({ kind: "compose", id: app.id }),
    listComposeDeployments(app.id),
    getComposeWebhook(app.id),
    listMounts({ kind: "compose", id: app.id }),
    getVerifiedSession(),
    fetchMetricsAction("compose", app.id),
  ])
  const canBind = session ? canUseTerminal(session.user) : false
  // Service names come from the running stack; a never-deployed stack has none yet.
  const services = [...new Set(app.containers.map((c) => c.service))].filter(
    Boolean
  )
  const template = templates.find((t) => t.id === app.templateId)

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
            <Badge
              variant={
                app.status === "running"
                  ? "default"
                  : app.status === "error"
                    ? "destructive"
                    : "secondary"
              }
            >
              {app.status === "deploying" ? "berjalan…" : app.status}
            </Badge>
            <Badge variant="outline">compose</Badge>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {app.source === "template"
              ? `template · ${app.templateId}`
              : `${(app.gitUrl ?? "").replace(/^https?:\/\//, "")}#${app.gitBranch} · ${app.composePath}`}
          </p>
        </div>
      </div>

      <Tabs defaultValue="deploy">
        <TabsList>
          <TabsTrigger value="deploy">Deploy</TabsTrigger>
          <TabsTrigger value="history">Riwayat ({runs.length})</TabsTrigger>
          <TabsTrigger value="mounts">Mount ({mounts.length})</TabsTrigger>
          <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
          <TabsTrigger value="settings">Pengaturan</TabsTrigger>
        </TabsList>
        <TabsContent value="deploy" className="space-y-4 pt-4">
          <ComposeAccessHint
            domains={app.serviceDomains}
            ports={app.servicePorts}
            proxy={proxy}
            running={app.status === "running"}
          />
          <ComposePanel initial={app} metrics={metrics} />
        </TabsContent>
        <TabsContent value="history" className="pt-4">
          <ComposeHistory appId={app.id} initial={runs} />
        </TabsContent>
        <TabsContent value="mounts" className="pt-4">
          <ComposeMounts appId={app.id} mounts={mounts} canBind={canBind} />
        </TabsContent>
        <TabsContent value="jobs" className="pt-4">
          <ApplicationJobs
            owner={{ kind: "compose", id: app.id }}
            jobs={jobs}
            services={services}
          />
        </TabsContent>
        <TabsContent value="settings" className="space-y-4 pt-4">
          {webhook && (
            <ComposeWebhook composeAppId={app.id} webhook={webhook} />
          )}
          <ComposeAccess
            appId={app.id}
            domains={app.serviceDomains}
            ports={app.servicePorts}
            proxy={proxy}
            suggestions={template?.services ?? []}
          />
          <ComposeResources appId={app.id} resources={app.serviceResources} />
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan</CardTitle>
              <CardDescription>
                Perubahan berlaku pada deploy berikutnya.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ComposeForm
                action={updateComposeAppAction.bind(null, app.id)}
                defaultValues={{
                  name: app.name,
                  gitUrl: app.gitUrl ?? "",
                  gitBranch: app.gitBranch,
                  composePath: app.composePath,
                  gitCredentialId: app.gitCredentialId ?? "",
                  env: app.env,
                  composeContent: app.composeContent ?? "",
                }}
                source={app.source}
                submitLabel="Simpan"
                credentials={credentials}
                databaseSlugs={databases.map((d) => d.slug)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
