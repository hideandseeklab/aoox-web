import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { InstanceEnvCard } from "@/components/custom/instance-env-card"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { getInstanceEnvStatus } from "@/features/instance-env/instance-env.queries"
import { InfraPage } from "../infra-page"

export async function generateMetadata() {
  const t = await getTranslations("infra.pages.environment")
  return { title: t("metadata") }
}

export default async function InstanceEnvPage() {
  const t = await getTranslations("infra.pages.environment")
  const session = await getVerifiedSession()
  // Owner only: recreates the panel's own api container.
  if (!session || session.user.role !== "owner") notFound()
  const status = await getInstanceEnvStatus()
  return (
    <InfraPage title={t("title")} description={t("description")}>
      <InstanceEnvCard status={status} />
    </InfraPage>
  )
}
