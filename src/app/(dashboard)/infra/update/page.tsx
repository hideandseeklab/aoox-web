import { notFound } from "next/navigation"
import { InstanceUpdateCard } from "@/components/custom/instance-update-card"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { getInstanceUpdateStatus } from "@/features/instance-update/instance-update.queries"
import { InfraPage } from "../infra-page"

export const metadata = { title: "Update aoox · aoox" }

export default async function InstanceUpdatePage() {
  const session = await getVerifiedSession()
  // Owner only: recreates the panel's own web/api containers.
  if (!session || session.user.role !== "owner") notFound()
  const status = await getInstanceUpdateStatus()
  return (
    <InfraPage
      title="Update aoox"
      description="Cek dan terapkan update untuk panel ini sendiri."
    >
      <InstanceUpdateCard status={status} />
    </InfraPage>
  )
}
