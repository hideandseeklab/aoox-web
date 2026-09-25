import { notFound } from "next/navigation"
import { DiskCard } from "@/components/custom/disk-card"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { getDiskUsage } from "@/features/maintenance/maintenance.queries"
import { InfraPage } from "../infra-page"

export const metadata = { title: "Disk Docker · aoox" }

export default async function DiskPage() {
  const session = await getVerifiedSession()
  // Owner/admin only (the API enforces it too; members get a 404 rather than a 403 page).
  if (!session || !canUseTerminal(session.user)) notFound()
  const usage = await getDiskUsage()
  return (
    <InfraPage
      title="Disk Docker"
      description="Pemakaian disk oleh image, volume, container, dan build cache; pembersihan manual atau malam hari."
    >
      <DiskCard usage={usage} canRun={session.user.role === "owner"} />
    </InfraPage>
  )
}
