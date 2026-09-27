import { notFound } from "next/navigation"
import { InstanceEnvCard } from "@/components/custom/instance-env-card"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { getInstanceEnvStatus } from "@/features/instance-env/instance-env.queries"
import { InfraPage } from "../infra-page"

export const metadata = { title: "Environment · aoox" }

export default async function InstanceEnvPage() {
  const session = await getVerifiedSession()
  // Owner only: recreates the panel's own api container.
  if (!session || session.user.role !== "owner") notFound()
  const status = await getInstanceEnvStatus()
  return (
    <InfraPage
      title="Environment"
      description="Ubah sebagian env var instance ini dari dashboard, tanpa SSH."
    >
      <InstanceEnvCard status={status} />
    </InfraPage>
  )
}
