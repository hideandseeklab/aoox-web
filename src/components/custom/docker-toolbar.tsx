"use client"

import { useTranslations } from "next-intl"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { DockerQueryContext, DockerSearch } from "@/components/custom/docker-ui"
import { ScrollableTabsList } from "@/components/custom/scrollable-tabs-list"
import { PageTabsTrigger } from "@/components/custom/page-tabs-trigger"
import { Container, Layers, HardDrive, Network } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs } from "@/components/ui/tabs"
import { DOCKER_TABS, type DockerTab } from "@/features/docker/docker.entity"
import type { Server } from "@/features/server/server.entity"
import { useRouter } from "@/lib/use-router"

const HOST = "host"

const DOCKER_TAB_ICONS = {
  containers: Container,
  images: Layers,
  volumes: HardDrive,
  networks: Network,
} as const

/**
 * One toolbar row: server picker, tabs, and the search box at the right edge
 * (it wraps onto its own full-width row on a narrow screen). Server and tab live
 * in the URL (`?server=&tab=`), so the page is a server component that fetches
 * only what the open tab needs and a link to a tab or server can be shared. The
 * search text is shared with the tab tables below through `DockerQueryContext`
 * and starts empty on every tab.
 */
export function DockerToolbar({
  servers,
  serverId,
  tab,
  children,
}: {
  servers: Server[]
  serverId: string | null
  tab: DockerTab
  children: React.ReactNode
}) {
  const t = useTranslations("docker.toolbar")
  const router = useRouter()
  const pathname = usePathname()
  // Remember which tab the text was typed on, so switching tab starts empty.
  const [typed, setTyped] = useState({ tab, text: "" })
  const query = typed.tab === tab ? typed.text : ""

  const go = (nextServer: string | null, nextTab: DockerTab) => {
    const p = new URLSearchParams({ tab: nextTab })
    if (nextServer) p.set("server", nextServer)
    router.replace(`${pathname}?${p.toString()}`)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs">
        <span className="text-muted-foreground">Server</span>
        <Select
          value={serverId ?? HOST}
          onValueChange={(v) => go(v === HOST ? null : v, tab)}
        >
          <SelectTrigger className="w-44" aria-label={t("pickServer")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={HOST}>{t("host")}</SelectItem>
            {servers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} · {s.host}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Tabs
          value={tab}
          onValueChange={(v) => go(serverId, v as DockerTab)}
          className="max-w-full"
        >
          <ScrollableTabsList>
            {DOCKER_TABS.map((name) => (
              <PageTabsTrigger
                key={name}
                value={name}
                icon={DOCKER_TAB_ICONS[name]}
                className="py-1.5"
              >
                {t(`tabs.${name}`)}
              </PageTabsTrigger>
            ))}
          </ScrollableTabsList>
        </Tabs>
        <div className="ms-auto w-full sm:max-w-sm sm:min-w-44 sm:flex-1">
          <DockerSearch
            value={query}
            onChange={(text) => setTyped({ tab, text })}
            placeholder={t(`search.${tab}`)}
          />
        </div>
      </div>
      <DockerQueryContext.Provider value={query}>
        {children}
      </DockerQueryContext.Provider>
    </>
  )
}
