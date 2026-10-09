import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"
import { CreateApplicationPageForm } from "@/components/custom/create-application-page-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { listGitCredentials } from "@/features/git-credential/git-credential.queries"
import { listRegistries } from "@/features/registry/registry.queries"
import { listServers } from "@/features/server/server.queries"
import { getProject } from "@/features/project/project.queries"
import { getProxyStatus } from "@/features/proxy/proxy.queries"

export default async function NewApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const t = await getTranslations("applications")
  const tb = await getTranslations("breadcrumb")
  const { id } = await params
  const project = await getProject(id)
  if (!project) notFound()

  const [credentials, servers, registries, proxy] = await Promise.all([
    listGitCredentials(),
    // Members get 403 here; they can still create apps on the host.
    listServers().catch(() => []),
    listRegistries().catch(() => []),
    getProxyStatus(),
  ])

  return (
    <>
      <SetBreadcrumb
        items={[
          { label: tb("projects"), href: "/projects" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: t("page.newTitle") },
        ]}
      />
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon" className="mt-0.5">
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

      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <CreateApplicationPageForm
            projectId={project.id}
            credentials={credentials}
            servers={servers}
            registries={registries}
            proxy={proxy}
          />
        </CardContent>
      </Card>
    </>
  )
}
