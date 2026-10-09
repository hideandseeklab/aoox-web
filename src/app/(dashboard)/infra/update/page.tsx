import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { InstanceUpdateCard } from "@/components/custom/instance-update-card"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { getInstanceUpdateStatus } from "@/features/instance-update/instance-update.queries"
import { InfraPage } from "../infra-page"

export async function generateMetadata() {
  const t = await getTranslations("infra.pages.update")
  return { title: t("metadata") }
}

export default async function InstanceUpdatePage() {
  const t = await getTranslations("infra.pages.update")
  const session = await getVerifiedSession()
  // Owner only: recreates the panel's own web/api containers.
  if (!session || session.user.role !== "owner") notFound()
  const status = await getInstanceUpdateStatus()
  return (
    <InfraPage title={t("title")} description={t("description")}>
      <InstanceUpdateCard status={status} />
    </InfraPage>
  )
}
