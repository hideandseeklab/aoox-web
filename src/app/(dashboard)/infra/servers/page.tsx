import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { ServersCard } from "@/components/custom/servers-card"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import {
  getPlatformSshKey,
  listServers,
} from "@/features/server/server.queries"
import { InfraPage } from "../infra-page"

export async function generateMetadata() {
  const t = await getTranslations("infra.pages.servers")
  return { title: t("metadata") }
}

export default async function ServersPage() {
  const t = await getTranslations("infra.pages.servers")
  const session = await getVerifiedSession()
  // Owner/admin only (the API enforces it too; members get a 404 rather than a 403 page).
  if (!session || !canUseTerminal(session.user)) notFound()
  const [servers, platformKey] = await Promise.all([
    listServers(),
    getPlatformSshKey(),
  ])
  return (
    <InfraPage title={t("title")} description={t("description")}>
      <ServersCard servers={servers} platformKey={platformKey} />
    </InfraPage>
  )
}
