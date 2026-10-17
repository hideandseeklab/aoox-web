import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import {
  AddNotificationDialog,
  NotificationsCard,
} from "@/components/custom/notifications-card"
import { IllustratedEmptyState } from "@/components/custom/illustrated-empty-state"
import { NotificationsIllustration } from "@/components/custom/illustrations/notifications-illustration"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { listNotifications } from "@/features/notification/notification.queries"
import { IntegrationPage } from "../integration-page"

export async function generateMetadata() {
  const t = await getTranslations("integrations.pages.notifications")
  return { title: t("metadata") }
}

export default async function NotificationsPage() {
  const t = await getTranslations("integrations.pages.notifications")
  const session = await getVerifiedSession()
  // Owner/admin only (the API enforces it too; members get a 404 rather than a 403 page).
  if (!session || !canUseTerminal(session.user)) notFound()
  const data = await listNotifications()
  if (!data) notFound()
  return (
    <IntegrationPage title={t("title")} description={t("description")}>
      {data.length === 0 ? (
        <IllustratedEmptyState
          illustration={<NotificationsIllustration />}
          title={t("emptyTitle")}
          description={t("emptyBody")}
          actions={<AddNotificationDialog size="default" />}
        />
      ) : (
        <NotificationsCard notifications={data} />
      )}
    </IntegrationPage>
  )
}
