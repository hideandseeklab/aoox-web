import { Variable } from "lucide-react"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"
import { DangerZone } from "@/components/custom/danger-zone"
import { ResourceHeader } from "@/components/custom/resource-header"
import { VariableSetEnvironments } from "@/components/custom/variable-set-environments"
import {
  DeleteVariableSetButton,
  VariableSetDetailsCard,
  VariableSetSharingCard,
} from "@/components/custom/variable-set-settings"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { listProjects } from "@/features/project/project.queries"
import { getVariableSet } from "@/features/variable-set/variable-set.queries"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const set = await getVariableSet(id).catch(() => null)
  const t = await getTranslations("variables")
  return { title: set?.name ?? t("meta.title") }
}

export default async function VariableSetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const t = await getTranslations("variables")
  const { id } = await params
  const set = await getVariableSet(id)
  if (!set) notFound()
  const projects = set.canManage ? await listProjects().catch(() => []) : []
  const sharing = set.sharedWithAll
    ? t("list.sharedAll")
    : set.projects.length > 0
      ? set.projects.map((p) => p.name).join(", ")
      : t("list.notShared")

  return (
    <>
      <SetBreadcrumb
        items={[
          { label: t("list.title"), href: "/variables" },
          { label: set.name },
        ]}
      />
      <ResourceHeader
        backHref="/variables"
        backLabel={t("detail.back")}
        icon={<Variable className="size-5" />}
        title={set.name}
        badges={
          set.role === "viewer" ? (
            <Badge variant="outline">{t("detail.readOnly")}</Badge>
          ) : undefined
        }
        meta={[
          <span key="slug" className="font-mono">
            {set.slug}
          </span>,
          t("detail.sharedWith", { names: sharing }),
          t("list.usage", {
            apps: set.usage.applications,
            stacks: set.usage.composeApps,
          }),
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="min-w-0 space-y-6">
          <VariableSetEnvironments set={set} />
        </div>

        <div className="min-w-0 space-y-6">
          {set.canManage ? (
            <>
              <VariableSetDetailsCard set={set} />
              <VariableSetSharingCard
                set={set}
                projects={projects
                  .map((p) => ({ id: p.id, name: p.name }))
                  .sort((a, b) => a.name.localeCompare(b.name))}
              />
              <DangerZone
                title={t("danger.title")}
                description={t("danger.description")}
                items={[
                  {
                    title: t("danger.deleteTitle"),
                    description: t("danger.deleteDescription"),
                    action: <DeleteVariableSetButton set={set} />,
                  },
                ]}
              />
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{t("details.title")}</CardTitle>
                <CardDescription>
                  {t("detail.aboutDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">
                      {t("details.descriptionLabel")}
                    </dt>
                    <dd className="min-w-0 text-end break-words">
                      {set.description || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">
                      {t("sharing.title")}
                    </dt>
                    <dd className="min-w-0 text-end break-words">{sharing}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">
                      {t("detail.yourAccess")}
                    </dt>
                    <dd className="text-end">{t(`roles.${set.role}`)}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t(`detail.accessNote.${set.role}`)}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
