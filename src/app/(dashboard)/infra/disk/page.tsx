import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { DiskCard } from "@/components/custom/disk-card"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { getDiskUsage } from "@/features/maintenance/maintenance.queries"
import { InfraPage } from "../infra-page"

export async function generateMetadata() {
  const t = await getTranslations("infra.pages.disk")
  return { title: t("metadata") }
}

export default async function DiskPage() {
  const t = await getTranslations("infra.pages.disk")
  const session = await getVerifiedSession()
  // Owner/admin only (the API enforces it too; members get a 404 rather than a 403 page).
  if (!session || !canUseTerminal(session.user)) notFound()
  const usage = await getDiskUsage()
  return (
    <InfraPage title={t("title")} description={t("description")}>
      <DiskCard usage={usage} canRun={session.user.role === "owner"} />
    </InfraPage>
  )
}
