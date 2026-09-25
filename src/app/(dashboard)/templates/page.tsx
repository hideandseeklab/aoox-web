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
  const [templates, projects, proxy] = await Promise.all([
    listTemplates(),
    listProjects(),
    getProxyStatus(),
  ])

  return (
    <>
      <div>
        <h1 className="text-lg font-semibold">Templates</h1>
        <p className="text-sm text-muted-foreground">
          Aplikasi siap pakai (stack compose) — pilih project, isi domain, dan
          deploy dalam satu klik. Setelah dibuat, stack bisa diubah seperti
          compose app biasa.
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
