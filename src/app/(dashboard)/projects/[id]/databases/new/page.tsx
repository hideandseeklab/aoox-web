import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"
import { DatabaseForm } from "@/components/custom/database-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createDatabaseAction } from "@/features/managed-database/managed-database.actions"
import { getProject } from "@/features/project/project.queries"

export default async function NewDatabasePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) notFound()

  return (
    <>
      <SetBreadcrumb
        items={[
          { label: "Projects", href: "/projects" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: "Database baru" },
        ]}
      />
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon" className="mt-0.5">
          <Link href={`/projects/${project.id}`} aria-label="Kembali ke project">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Database baru</h1>
          <p className="text-sm text-muted-foreground">
            Dijalankan sebagai container dengan volume persisten di network
            aoox; aplikasi di project ini bisa mengaksesnya lewat nama host
            internal.
          </p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <DatabaseForm
            action={createDatabaseAction.bind(null, project.id)}
            submitLabel="Buat database"
            cancelHref={`/projects/${project.id}`}
          />
        </CardContent>
      </Card>
    </>
  )
}
