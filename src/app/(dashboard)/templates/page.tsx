import { getTranslations } from "next-intl/server"
import { TemplatesCatalog } from "@/components/custom/templates-catalog"
import { listProjects } from "@/features/project/project.queries"
import { getProxyStatus } from "@/features/proxy/proxy.queries"
import { listTemplates } from "@/features/template/template.queries"

export const metadata = { title: "Templates · aoox" }

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const { project } = await searchParams
  const t = await getTranslations("templates.page")
  const [templates, projects, proxy] = await Promise.all([
    listTemplates(),
    listProjects(),
    getProxyStatus(),
  ])

  return (
    <>
      <div>
        <h1 className="text-lg font-semibold">Templates</h1>
        <p className="text-xs text-muted-foreground">
          {t("description")}
        </p>
      </div>
      <TemplatesCatalog
        templates={templates}
        projects={projects}
        proxy={proxy}
        defaultProjectId={project}
      />
    </>
  )
}
