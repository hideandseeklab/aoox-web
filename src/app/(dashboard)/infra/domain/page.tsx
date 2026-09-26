import { notFound } from "next/navigation"
import { PanelDomainCard } from "@/components/custom/panel-domain-card"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { getPanelDomainStatus } from "@/features/panel-domain/panel-domain.queries"
import { InfraPage } from "../infra-page"

export const metadata = { title: "Domain panel · aoox" }

export default async function PanelDomainPage() {
  const session = await getVerifiedSession()
  // Owner only: recreates the panel's own web/api containers.
  if (!session || session.user.role !== "owner") notFound()
  const status = await getPanelDomainStatus()
  return (
    <InfraPage
      title="Domain panel"
      description="Akses dashboard dan API ini lewat domain sendiri."
    >
      <PanelDomainCard status={status} />
    </InfraPage>
  )
}
