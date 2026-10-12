import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { CertificatesCard } from "@/components/custom/certificates-card"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { listCertificates } from "@/features/certificate/certificate.queries"
import { IntegrationPage } from "../integration-page"

export async function generateMetadata() {
  const t = await getTranslations("integrations.pages.certificates")
  return { title: t("metadata") }
}

export default async function CertificatesPage() {
  const t = await getTranslations("integrations.pages.certificates")
  const session = await getVerifiedSession()
  // Owner/admin only (the API enforces it too; members get a 404 rather than a 403 page).
  if (!session || !canUseTerminal(session.user)) notFound()
  const data = await listCertificates().catch(() => null)
  if (!data) notFound()
  return (
    <IntegrationPage title={t("title")} description={t("description")}>
      <CertificatesCard certificates={data} />
    </IntegrationPage>
  )
}
