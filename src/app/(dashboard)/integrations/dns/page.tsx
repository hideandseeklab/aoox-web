import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import {
  AddConnectionDialog,
  DnsConnectionsCard,
} from "@/components/custom/dns-connections-card"
import { IllustratedEmptyState } from "@/components/custom/illustrated-empty-state"
import { DnsIllustration } from "@/components/custom/illustrations/dns-illustration"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { listDnsConnections } from "@/features/dns/dns.queries"
import { IntegrationPage } from "../integration-page"

export async function generateMetadata() {
  const t = await getTranslations("integrations.pages.dns")
  return { title: t("metadata") }
}

export default async function DnsPage() {
  const t = await getTranslations("integrations.pages.dns")
  const session = await getVerifiedSession()
  // Owner/admin only (the API enforces it too; members get a 404 rather than a 403 page).
  if (!session || !canUseTerminal(session.user)) notFound()
  const data = await listDnsConnections().catch(() => null)
  if (!data) notFound()
  return (
    <IntegrationPage title={t("title")} description={t("description")}>
      {data.length === 0 ? (
        <IllustratedEmptyState
          illustration={<DnsIllustration />}
          title={t("emptyTitle")}
          description={t("emptyBody")}
          actions={<AddConnectionDialog size="default" />}
        />
      ) : (
        <DnsConnectionsCard connections={data} />
      )}
    </IntegrationPage>
  )
}
