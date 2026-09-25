import { ProxyCard } from "@/components/custom/proxy-card"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { getProxyStatus } from "@/features/proxy/proxy.queries"
import { InfraPage } from "../infra-page"

export const metadata = { title: "Reverse proxy · aoox" }

export default async function ProxyPage() {
  const [session, status] = await Promise.all([
    getVerifiedSession(),
    getProxyStatus(),
  ])
  return (
    <InfraPage
      title="Reverse proxy"
      description="Traefik di host ini: merutekan domain ke container aplikasi dan menerbitkan sertifikat HTTPS."
    >
      <ProxyCard
        status={status}
        canManage={session ? canUseTerminal(session.user) : false}
      />
    </InfraPage>
  )
}
