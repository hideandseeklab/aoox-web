import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"
import { ComposeForm } from "@/components/custom/compose-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createComposeAppAction } from "@/features/compose/compose.actions"
import { listGitCredentials } from "@/features/git-credential/git-credential.queries"
import { listDatabases } from "@/features/managed-database/managed-database.queries"
import { getProject } from "@/features/project/project.queries"

export default async function NewComposePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) notFound()

  const [credentials, databases] = await Promise.all([
    listGitCredentials(),
    listDatabases(project.id),
  ])

  return (
    <>
      <SetBreadcrumb
        items={[
          { label: "Projects", href: "/projects" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: "Stack compose baru" },
        ]}
      />
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon" className="mt-0.5">
          <Link href={`/projects/${project.id}`} aria-label="Kembali ke project">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Stack compose baru</h1>
          <p className="text-sm text-muted-foreground">
            Deploy <code>docker-compose.yml</code> dari repo git; layanan di
            dalamnya di-build dan dijalankan apa adanya.
          </p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <ComposeForm
            action={createComposeAppAction.bind(null, project.id)}
            mode="create"
            submitLabel="Buat stack"
            credentials={credentials}
            databaseSlugs={databases.map((d) => d.slug)}
            cancelHref={`/projects/${project.id}`}
          />
        </CardContent>
      </Card>
    </>
  )
}
