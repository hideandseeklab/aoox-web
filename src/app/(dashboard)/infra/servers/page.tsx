import { notFound } from "next/navigation"
import { ServersCard } from "@/components/custom/servers-card"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import {
  getPlatformSshKey,
  listServers,
} from "@/features/server/server.queries"
import { InfraPage } from "../infra-page"

export const metadata = { title: "Server remote · aoox" }

export default async function ServersPage() {
  const session = await getVerifiedSession()
  // Owner/admin only (the API enforces it too; members get a 404 rather than a 403 page).
  if (!session || !canUseTerminal(session.user)) notFound()
  const [servers, platformKey] = await Promise.all([
    listServers(),
    getPlatformSshKey(),
  ])
  return (
    <InfraPage
      title="Server remote"
      description="VPS lain yang dijangkau lewat SSH: tempat deploy aplikasi dan target Terminal."
    >
      <ServersCard servers={servers} platformKey={platformKey} />
    </InfraPage>
  )
}
