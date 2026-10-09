import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { PanelDomainCard } from "@/components/custom/panel-domain-card"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { getPanelDomainStatus } from "@/features/panel-domain/panel-domain.queries"
import { InfraPage } from "../infra-page"

export async function generateMetadata() {
  const t = await getTranslations("infra.pages.domain")
  return { title: t("metadata") }
}

export default async function PanelDomainPage() {
  const t = await getTranslations("infra.pages.domain")
  const session = await getVerifiedSession()
  // Owner only: recreates the panel's own web/api containers.
  if (!session || session.user.role !== "owner") notFound()
  const status = await getPanelDomainStatus()
  return (
    <InfraPage title={t("title")} description={t("description")}>
      <PanelDomainCard status={status} />
    </InfraPage>
  )
}
