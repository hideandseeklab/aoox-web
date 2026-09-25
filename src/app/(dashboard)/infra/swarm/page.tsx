import { notFound } from "next/navigation"
import { SwarmCard } from "@/components/custom/swarm-card"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { getSwarmStatus } from "@/features/swarm/swarm.queries"
import { InfraPage } from "../infra-page"

export const metadata = { title: "Docker Swarm · aoox" }

export default async function SwarmPage() {
  const session = await getVerifiedSession()
  // Owner/admin only (the API enforces it too; members get a 404 rather than a 403 page).
  if (!session || !canUseTerminal(session.user)) notFound()
  const status = await getSwarmStatus()
  return (
    <InfraPage
      title="Docker Swarm"
      description="Mode service untuk aplikasi (replika, rolling update) dan node yang tergabung."
    >
      <SwarmCard status={status} isOwner={session.user.role === "owner"} />
    </InfraPage>
  )
}
