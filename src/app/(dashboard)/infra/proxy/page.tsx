import { TriangleAlert } from "lucide-react"
import { unstable_rethrow } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { DangerZone } from "@/components/custom/danger-zone"
import { ProxyCard, ProxyRemoveButton } from "@/components/custom/proxy-card"
import { ProxyDnsCard } from "@/components/custom/proxy-dns-card"
import { ProxyConfigCard } from "@/components/custom/proxy-config-card"
import { ProxyTargetSelect } from "@/components/custom/proxy-target-select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { getProxyDns, listDnsConnections } from "@/features/dns/dns.queries"
import type { ProxyStatus } from "@/features/proxy/proxy.entity"
import {
  getProxyStatus,
  getServerProxyStatus,
} from "@/features/proxy/proxy.queries"
import {
  listProxyConfig,
  listProxyPresets,
} from "@/features/proxy-config/proxy-config.queries"
import type { Server } from "@/features/server/server.entity"
import { listServers } from "@/features/server/server.queries"
import { ApiError } from "@/lib/api"
import { InfraPage } from "../infra-page"

export async function generateMetadata() {
  const t = await getTranslations("infra.pages.proxy")
  return { title: t("metadata") }
}

/**
 * One "Proxy on" choice (`?server=`) at the top drives every card: Traefik status, DNS-01 and
 * the dynamic configuration. The choice and the two lower cards are owner/admin only.
 */
export default async function ProxyPage({
  searchParams,
}: {
  searchParams: Promise<{ server?: string }>
}) {
  const t = await getTranslations("infra.pages.proxy")
  const tc = await getTranslations("infra.proxyCard")
  const [session, sp] = await Promise.all([getVerifiedSession(), searchParams])
  const canManage = session ? canUseTerminal(session.user) : false
  const isOwner = session?.user.role === "owner"
  const servers = canManage ? await listServers() : []
  const server = servers.find((s) => s.id === sp.server) ?? null
  const serverId = server?.id ?? null

  const [status, config, dns] = await Promise.all([
    loadStatus(server),
    // The dynamic-config editor is owner/admin only (the API enforces it as well).
    canManage ? loadConfig(serverId) : null,
    // An older API without DNS providers answers 404: no card then.
    canManage ? loadDns(serverId) : null,
  ])

  return (
    <InfraPage
      title={t("title")}
      description={t("description")}
      actions={
        canManage ? (
          <ProxyTargetSelect servers={servers} serverId={serverId} />
        ) : undefined
      }
    >
      {"error" in status ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>{tc("remoteError")}</AlertTitle>
          <AlertDescription>{status.error}</AlertDescription>
        </Alert>
      ) : (
        <ProxyCard status={status} canManage={canManage} server={server} />
      )}
      {dns && <ProxyDnsCard {...dns} serverId={serverId} isOwner={isOwner} />}
      {config && (
        <ProxyConfigCard {...config} serverId={serverId} isOwner={isOwner} />
      )}
      {canManage && !server && !("error" in status) && status.installed && (
        <DangerZone
          title={tc("danger.title")}
          description={tc("danger.description")}
          items={[
            {
              title: tc("danger.removeTitle"),
              description: tc("danger.removeDescription"),
              action: <ProxyRemoveButton />,
            },
          ]}
        />
      )}
    </InfraPage>
  )
}

/** Host status as before; a remote server is read over SSH, so a failure becomes an alert. */
async function loadStatus(
  server: Server | null
): Promise<ProxyStatus | { error: string }> {
  if (!server) return getProxyStatus()
  try {
    return await getServerProxyStatus(server.id)
  } catch (err) {
    unstable_rethrow(err)
    if (err instanceof ApiError) return { error: err.message }
    const te = await getTranslations("infra.errors")
    return { error: te("serverUnreachable") }
  }
}

async function loadConfig(serverId: string | null) {
  const [files, presets] = await Promise.all([
    listProxyConfig(serverId ?? undefined),
    listProxyPresets(),
  ])
  return { files, presets }
}

async function loadDns(serverId: string | null) {
  try {
    const [state, connections] = await Promise.all([
      getProxyDns(serverId ?? undefined),
      listDnsConnections(),
    ])
    return { state, connections }
  } catch {
    return null
  }
}
