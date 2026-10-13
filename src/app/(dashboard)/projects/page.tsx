import { getTranslations } from "next-intl/server"
import { CreateProjectDialog } from "@/components/custom/create-project-dialog"
import { ImportProjectDialog } from "@/components/custom/import-project-dialog"
import { ProjectCard } from "@/components/custom/project-card"
import { ProjectsAutoRefresh } from "@/components/custom/projects-auto-refresh"
import { listProjects } from "@/features/project/project.queries"
import { IllustratedEmptyState } from "@/components/custom/illustrated-empty-state"
import { ProjectsIllustration } from "@/components/custom/illustrations/projects-illustration"

export async function generateMetadata() {
  const t = await getTranslations("projects")
  return { title: t("meta.title") }
}

export default async function ProjectsPage() {
  const t = await getTranslations("projects")
  const projects = await listProjects()
  const anyDeploying = projects.some((p) =>
    p.instances.some((i) => i.deploying)
  )
  const anyRunning = projects.some((p) => p.resourceUsage !== null)

  return (
    <>
      <ProjectsAutoRefresh
        active={anyDeploying || anyRunning}
        intervalMs={anyDeploying ? 4000 : 10000}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">{t("list.title")}</h1>
          <p className="text-xs text-muted-foreground">
            {t("list.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <ImportProjectDialog />
          <CreateProjectDialog />
        </div>
      </div>

      {projects.length === 0 ? (
        <IllustratedEmptyState
          illustration={<ProjectsIllustration />}
          title={t("list.emptyTitle")}
          description={t("list.emptyBody")}
          actions={
            <>
              <CreateProjectDialog />
              <ImportProjectDialog />
            </>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </>
  )
}
