import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"
import { DatabaseForm } from "@/components/custom/database-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createDatabaseAction } from "@/features/managed-database/managed-database.actions"
import { redirectViewerToProject } from "@/features/project-member/project-member.queries"
import { getProject } from "@/features/project/project.queries"

export default async function NewDatabasePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const t = await getTranslations("database")
  const tb = await getTranslations("breadcrumb")
  const project = await getProject(id)
  if (!project) notFound()
  await redirectViewerToProject(project.id)

  return (
    <>
      <SetBreadcrumb
        items={[
          { label: tb("projects"), href: "/projects" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: t("page.newTitle") },
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
          <h1 className="text-lg font-semibold">{t("page.newTitle")}</h1>
          <p className="text-xs text-muted-foreground">
            {t("page.newDescription")}
          </p>
        </div>
      </div>

      <Card className="max-w-5xl">
        <CardContent>
          <DatabaseForm
            action={createDatabaseAction.bind(null, project.id)}
            submitLabel={t("page.createSubmit")}
            cancelHref={`/projects/${project.id}`}
          />
        </CardContent>
      </Card>
    </>
  )
}
