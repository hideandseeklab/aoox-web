import { getTranslations } from "next-intl/server"
import { ProxyCard } from "@/components/custom/proxy-card"
import { ProxyConfigCard } from "@/components/custom/proxy-config-card"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { getProxyStatus } from "@/features/proxy/proxy.queries"
import {
  listProxyConfig,
  listProxyPresets,
} from "@/features/proxy-config/proxy-config.queries"
import { listServers } from "@/features/server/server.queries"
import { InfraPage } from "../infra-page"

export async function generateMetadata() {
  const t = await getTranslations("infra.pages.proxy")
  return { title: t("metadata") }
}

export default async function ProxyPage({
  searchParams,
}: {
  searchParams: Promise<{ server?: string }>
}) {
  const t = await getTranslations("infra.pages.proxy")
  const [session, status, sp] = await Promise.all([
    getVerifiedSession(),
    getProxyStatus(),
    searchParams,
  ])
  const canManage = session ? canUseTerminal(session.user) : false
  // The dynamic-config editor is owner/admin only (the API enforces it as well).
  const config = canManage ? await loadConfig(sp.server) : null
  return (
    <InfraPage title={t("title")} description={t("description")}>
      <ProxyCard status={status} canManage={canManage} />
      {config && (
        <ProxyConfigCard {...config} isOwner={session?.user.role === "owner"} />
      )}
    </InfraPage>
  )
}

async function loadConfig(server: string | undefined) {
  const servers = await listServers()
  const serverId = servers.some((s) => s.id === server) ? server! : null
  const [files, presets] = await Promise.all([
    listProxyConfig(serverId ?? undefined),
    listProxyPresets(),
  ])
  return { files, presets, servers, serverId }
}
