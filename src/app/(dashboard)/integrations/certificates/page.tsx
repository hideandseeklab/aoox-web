import { Plus } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import {
  CertificateDialog,
  CertificatesCard,
} from "@/components/custom/certificates-card"
import { IllustratedEmptyState } from "@/components/custom/illustrated-empty-state"
import { CertificatesIllustration } from "@/components/custom/illustrations/certificates-illustration"
import { Button } from "@/components/ui/button"
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
  const ts = await getTranslations("settings")
  const session = await getVerifiedSession()
  // Owner/admin only (the API enforces it too; members get a 404 rather than a 403 page).
  if (!session || !canUseTerminal(session.user)) notFound()
  const data = await listCertificates().catch(() => null)
  if (!data) notFound()
  return (
    <IntegrationPage title={t("title")} description={t("description")}>
      {data.length === 0 ? (
        <IllustratedEmptyState
          illustration={<CertificatesIllustration />}
          title={t("emptyTitle")}
          description={t("emptyBody")}
          actions={
            <CertificateDialog
              trigger={
                <Button>
                  <Plus data-icon="inline-start" />
                  {ts("certificates.upload")}
                </Button>
              }
            />
          }
        />
      ) : (
        <CertificatesCard certificates={data} />
      )}
    </IntegrationPage>
  )
}
