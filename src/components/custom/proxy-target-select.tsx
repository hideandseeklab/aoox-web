"use client"

import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Server } from "@/features/server/server.entity"
import { useRouter } from "@/lib/use-router"

const HOST = "host"

/**
 * The one "Proxy on" choice of the Reverse proxy page: the aoox host or a remote server.
 * It lives in `?server=`, which every card on the page reads.
 */
export function ProxyTargetSelect({
  servers,
  serverId,
}: {
  servers: Server[]
  serverId: string | null
}) {
  const t = useTranslations("infra.pages.proxy")
  const router = useRouter()
  const pathname = usePathname()
  const current = servers.find((s) => s.id === serverId)

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">{t("proxyOn")}</span>
      <Select
        value={serverId ?? HOST}
        onValueChange={(next) =>
          router.replace(
            next === HOST
              ? pathname
              : `${pathname}?server=${encodeURIComponent(next)}`
          )
        }
      >
        <SelectTrigger className="w-56" aria-label={t("selectProxy")}>
          <SelectValue>
            {current ? `${current.name} · ${current.host}` : t("hostOption")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value={HOST}>{t("hostOption")}</SelectItem>
          {servers.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name} · {s.host}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
