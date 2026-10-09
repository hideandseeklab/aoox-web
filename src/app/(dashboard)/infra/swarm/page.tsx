import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { SwarmCard } from "@/components/custom/swarm-card"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { getSwarmStatus } from "@/features/swarm/swarm.queries"
import { InfraPage } from "../infra-page"

export async function generateMetadata() {
  const t = await getTranslations("infra.pages.swarm")
  return { title: t("metadata") }
}

export default async function SwarmPage() {
  const t = await getTranslations("infra.pages.swarm")
  const session = await getVerifiedSession()
  // Owner/admin only (the API enforces it too; members get a 404 rather than a 403 page).
  if (!session || !canUseTerminal(session.user)) notFound()
  const status = await getSwarmStatus()
  return (
    <InfraPage title={t("title")} description={t("description")}>
      <SwarmCard status={status} isOwner={session.user.role === "owner"} />
    </InfraPage>
  )
}
