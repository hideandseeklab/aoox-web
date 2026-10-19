import {
  Rocket,
  History,
  HardDrive,
  Timer,
  Settings,
} from "lucide-react"
import { getProject } from "@/features/project/project.queries"
import { listProjectVariableSets } from "@/features/variable-set/variable-set.queries"
import { VariableSetLinksEditor } from "@/components/custom/variable-set-links"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { ApplicationJobs } from "@/components/custom/application-jobs"
import { ComposeAccessHint } from "@/components/custom/compose-access-hint"
import { ComposeAccess } from "@/components/custom/compose-domains"
import { ComposeForm } from "@/components/custom/compose-form"
import { ComposeHistory } from "@/components/custom/compose-history"
import { ComposeMounts } from "@/components/custom/compose-mounts"
import { ComposeLiveProvider } from "@/components/custom/compose-live"
import { ComposePanel } from "@/components/custom/compose-panel"
import { ComposeHeader } from "@/components/custom/compose-header"
import { ComposeResources } from "@/components/custom/compose-resources"
import { ComposeWebhook } from "@/components/custom/compose-webhook"
import { WebhookHiddenCard } from "@/components/custom/webhook-card"
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
  const t = await getTranslations("compose")
  const tb = await getTranslations("breadcrumb")
  const tc = await getTranslations("common")
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
    variableSets,
  ] = await Promise.all([
    listGitCredentials(),
    listDatabases(app.projectId),
    getProxyStatus(),
    app.templateId ? listTemplates() : Promise.resolve([]),
    listJobs({ kind: "compose", id: app.id }),
    listComposeDeployments(app.id),
    // Viewers cannot read the webhook token/secret (403): skip the call.
    app.projectRole === "viewer"
      ? Promise.resolve(null)
      : getComposeWebhook(app.id),
    listMounts({ kind: "compose", id: app.id }),
    getVerifiedSession(),
    fetchMetricsAction("compose", app.id),
    listProjectVariableSets(app.projectId).catch(() => []),
  ])
  const canBind = session ? canUseTerminal(session.user) : false
  const canEdit = app.projectRole !== "viewer"
  // Service names come from the running stack; a never-deployed stack has none yet.
  const services = [...new Set(app.containers.map((c) => c.service))].filter(
    Boolean
  )
  const template = templates.find((tpl) => tpl.id === app.templateId)

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
      <ComposeLiveProvider initial={app}>
        <ComposeHeader
          backHref={`/projects/${app.projectId}`}
          backLabel={t("page.backToProject")}
        />
        <Tabs defaultValue="deploy">
          <ScrollableTabsList>
            <PageTabsTrigger icon={Rocket} value="deploy">
              {t("page.tabs.deploy")}
            </PageTabsTrigger>
            <PageTabsTrigger icon={History} value="history">
              {t("page.tabs.history", { count: runs.length })}
            </PageTabsTrigger>
            <PageTabsTrigger icon={HardDrive} value="mounts">
              {t("page.tabs.mounts", { count: mounts.length })}
            </PageTabsTrigger>
            <PageTabsTrigger icon={Timer} value="jobs">
              {t("page.tabs.jobs", { count: jobs.length })}
            </PageTabsTrigger>
            <PageTabsTrigger icon={Settings} value="settings">
              {t("page.tabs.settings")}
            </PageTabsTrigger>
          </ScrollableTabsList>
          <TabsContent value="deploy" className="space-y-4 pt-4">
            <ComposeAccessHint
              domains={app.serviceDomains}
              ports={app.servicePorts}
              proxy={proxy}
              running={app.status === "running"}
            />
            <ComposePanel metrics={metrics} />
          </TabsContent>
          <TabsContent value="history" className="pt-4">
            <ComposeHistory appId={app.id} initial={runs} />
          </TabsContent>
          <TabsContent value="mounts" className="pt-4">
            <ComposeMounts
              appId={app.id}
              mounts={mounts}
              canBind={canBind}
              canEdit={canEdit}
            />
          </TabsContent>
          <TabsContent value="jobs" className="pt-4">
            <ApplicationJobs
              owner={{ kind: "compose", id: app.id }}
              jobs={jobs}
              services={services}
              canEdit={canEdit}
            />
          </TabsContent>
          <TabsContent value="settings" className="space-y-4 pt-4">
            {webhook ? (
              <ComposeWebhook
                composeAppId={app.id}
                webhook={webhook}
                canEdit={canEdit}
              />
            ) : (
              !canEdit && <WebhookHiddenCard />
            )}
            <ComposeAccess
              appId={app.id}
              domains={app.serviceDomains}
              ports={app.servicePorts}
              proxy={proxy}
              suggestions={template?.services ?? []}
              canEdit={canEdit}
            />
            <ComposeResources
              appId={app.id}
              resources={app.serviceResources}
              canEdit={canEdit}
            />
            <VariableSetLinksEditor
              mode="saved"
              namespace="compose"
              owner={{ kind: "compose", id: app.id }}
              initial={app.variableSets ?? []}
              available={variableSets}
              ownEnv={app.env ?? ""}
              canEdit={canEdit}
              canLinkProtected={app.projectRole === "admin"}
            />
            <Card>
              <CardHeader>
                <CardTitle>{t("page.settingsTitle")}</CardTitle>
                <CardDescription>
                  {t("page.settingsDescription")}
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
                    env: app.env ?? "",
                    composeContent: app.composeContent ?? "",
                  }}
                  source={app.source}
                  submitLabel={tc("actions.save")}
                  credentials={credentials}
                  databaseSlugs={databases.map((d) => d.slug)}
                  readOnly={!canEdit}
                  envHidden={app.envHidden}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </ComposeLiveProvider>
    </>
  )
}
