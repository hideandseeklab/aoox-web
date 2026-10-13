import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { IllustratedEmptyState } from "@/components/custom/illustrated-empty-state"
import { NotFoundIllustration } from "@/components/custom/illustrations/not-found-illustration"
import { SetBreadcrumb } from "@/components/custom/breadcrumb-store"
import { Button } from "@/components/ui/button"

export default async function DashboardNotFound() {
  const t = await getTranslations("dashboard.notFound")
  return (
    <>
      {/* The URL is unknown, so the path-derived crumbs would be raw segments. */}
      <SetBreadcrumb items={[{ label: t("title") }]} />
      <IllustratedEmptyState
        illustration={<NotFoundIllustration />}
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild>
            <Link href="/">{t("back")}</Link>
          </Button>
        }
      />
    </>
  )
}
