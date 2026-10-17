import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import {
  AddConnectionDialog,
  SecretConnectionsCard,
} from "@/components/custom/secret-connections-card"
import { IllustratedEmptyState } from "@/components/custom/illustrated-empty-state"
import { SecretsIllustration } from "@/components/custom/illustrations/secrets-illustration"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { listSecretConnections } from "@/features/secret-connection/secret-connection.queries"
import { IntegrationPage } from "../integration-page"

export async function generateMetadata() {
  const t = await getTranslations("integrations.pages.secrets")
  return { title: t("metadata") }
}

export default async function SecretsPage() {
  const t = await getTranslations("integrations.pages.secrets")
  const session = await getVerifiedSession()
  // Owner/admin only (the API enforces it too; members get a 404 rather than a 403 page).
  if (!session || !canUseTerminal(session.user)) notFound()
  const data = await listSecretConnections().catch(() => null)
  if (!data) notFound()
  return (
    <IntegrationPage title={t("title")} description={t("description")}>
      {data.length === 0 ? (
        <IllustratedEmptyState
          illustration={<SecretsIllustration />}
          title={t("emptyTitle")}
          description={t("emptyBody")}
          actions={<AddConnectionDialog size="default" />}
        />
      ) : (
        <SecretConnectionsCard connections={data} />
      )}
    </IntegrationPage>
  )
}
