import { FolderKanban } from "lucide-react"
import { CreateProjectDialog } from "@/components/custom/create-project-dialog"
import { ImportProjectDialog } from "@/components/custom/import-project-dialog"
import { ProjectCard } from "@/components/custom/project-card"
import { listProjects } from "@/features/project/project.queries"

export const metadata = { title: "Projects · aoox" }

export default async function ProjectsPage() {
  const projects = await listProjects()

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Kelompokkan aplikasi dan database per project.
          </p>
        </div>
        <div className="flex gap-2">
          <ImportProjectDialog />
          <CreateProjectDialog />
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-12 text-center">
          <FolderKanban className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">Belum ada project</p>
          <p className="text-sm text-muted-foreground">
            Buat project pertama untuk mulai men-deploy.
          </p>
        </div>
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
