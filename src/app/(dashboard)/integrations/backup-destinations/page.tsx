import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { BackupDestinationsCard } from "@/components/custom/backup-destinations-card"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { listBackupDestinations } from "@/features/backup-destination/backup-destination.queries"
import { IntegrationPage } from "../integration-page"

export async function generateMetadata() {
  const t = await getTranslations("integrations.pages.backupDestinations")
  return { title: t("metadata") }
}

export default async function BackupDestinationsPage() {
  const t = await getTranslations("integrations.pages.backupDestinations")
  const session = await getVerifiedSession()
  // Owner/admin only (the API enforces it too; members get a 404 rather than a 403 page).
  if (!session || !canUseTerminal(session.user)) notFound()
  const data = await listBackupDestinations()
  if (!data) notFound()
  return (
    <IntegrationPage title={t("title")} description={t("description")}>
      <BackupDestinationsCard destinations={data} />
    </IntegrationPage>
  )
}
