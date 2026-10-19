import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"
import { ComposeForm } from "@/components/custom/compose-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createComposeAppAction } from "@/features/compose/compose.actions"
import { listGitCredentials } from "@/features/git-credential/git-credential.queries"
import { listDatabases } from "@/features/managed-database/managed-database.queries"
import { listProjectMembers } from "@/features/project-member/project-member.queries"
import { getProject } from "@/features/project/project.queries"
import { listProjectVariableSets } from "@/features/variable-set/variable-set.queries"

export default async function NewComposePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const t = await getTranslations("compose")
  const tb = await getTranslations("breadcrumb")
  const project = await getProject(id)
  if (!project) notFound()

  const [credentials, databases, variableSets, members] = await Promise.all([
    listGitCredentials(),
    listDatabases(project.id),
    listProjectVariableSets(project.id).catch(() => []),
    listProjectMembers(project.id).catch(() => null),
  ])

  return (
    <>
      <SetBreadcrumb
        items={[
          { label: tb("projects"), href: "/projects" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: t("newPage.title") },
        ]}
      />
      <div className="flex items-start gap-3 sm:items-center">
        <Button asChild variant="ghost" size="icon" className="mt-0.5 sm:mt-0">
          <Link
            href={`/projects/${project.id}`}
            aria-label={t("page.backToProject")}
          >
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold">{t("newPage.title")}</h1>
          <p className="text-xs text-muted-foreground">
            {t.rich("newPage.description", {
              code: (chunks) => <code>{chunks}</code>,
            })}
          </p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardContent>
          <ComposeForm
            action={createComposeAppAction.bind(null, project.id)}
            mode="create"
            submitLabel={t("form.createStack")}
            credentials={credentials}
            databaseSlugs={databases.map((d) => d.slug)}
            variableSets={variableSets}
            canLinkProtected={members ? members.myRole === "admin" : true}
            cancelHref={`/projects/${project.id}`}
          />
        </CardContent>
      </Card>
    </>
  )
}
