"use client"

import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  clearProxyDnsAction,
  setProxyDnsAction,
} from "@/features/dns/dns.actions"
import type { DnsConnection, ProxyDnsState } from "@/features/dns/dns.entity"
import type { Server } from "@/features/server/server.entity"
import { useRouter } from "@/lib/use-router"

const HOST = "host"

/**
 * ACME DNS-01 for one proxy (the aoox host or a remote server): binds a DNS provider
 * connection so the proxy gets a second certificate resolver (`le-dns`). Enabling or
 * disabling recreates a running proxy, so it asks first. Only the owner can change it.
 */
export function ProxyDnsCard({
  state,
  connections,
  servers,
  serverId,
  isOwner,
}: {
  state: ProxyDnsState
  connections: DnsConnection[]
  servers: Server[]
  serverId: string | null
  isOwner: boolean
}) {
  const t = useTranslations("dns.proxy")
  const router = useRouter()
  const pathname = usePathname()
  const [pending, start] = useTransition()
  const [choice, setChoice] = useState(
    state.connectionId ?? connections[0]?.id ?? ""
  )
  const [ask, setAsk] = useState<null | "enable" | "disable">(null)

  const go = (next: string) =>
    router.replace(next === HOST ? pathname : `${pathname}?server=${next}`)

  const bound = state.connectionId !== null
  const running = state.proxy === "running"
  const chosen = connections.find((c) => c.id === choice)
  const proxyLabel =
    serverId === null
      ? t("hostOption")
      : (() => {
          const s = servers.find((x) => x.id === serverId)
          return s ? `${s.name} · ${s.host}` : serverId
        })()

  const run = (kind: "enable" | "disable") =>
    start(async () => {
      const r =
        kind === "enable"
          ? await setProxyDnsAction({
              connectionId: choice,
              serverId,
              acceptProxyRestart: true,
            })
          : await clearProxyDnsAction({ serverId, acceptProxyRestart: true })
      if (!r.ok) return void toast.error(r.error)
      toast.success(kind === "enable" ? t("enabled") : t("disabled"))
      router.refresh()
    })

  const trigger = (kind: "enable" | "disable") => {
    if (running) setAsk(kind)
    else run(kind)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-60 flex-1">
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          {state.proxy === "not-running" || state.proxy === "not-installed" ? (
            bound ? (
              <Badge variant="secondary">{t("stateProxyDown")}</Badge>
            ) : (
              <Badge variant="secondary">{t("stateInactive")}</Badge>
            )
          ) : state.active ? (
            <Badge>{t("stateActive")}</Badge>
          ) : bound ? (
            <Badge variant="destructive">{t("statePending")}</Badge>
          ) : (
            <Badge variant="secondary">{t("stateInactive")}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">{t("proxyOn")}</span>
          <Select value={serverId ?? HOST} onValueChange={go}>
            <SelectTrigger
              size="sm"
              className="w-56"
              aria-label={t("selectProxy")}
            >
              <SelectValue>{proxyLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={HOST}>{t("hostOption")}</SelectItem>
              {servers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} · {s.host}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!state.acmeEmail && (
          <p className="text-destructive">{t("needsEmail")}</p>
        )}

        {bound ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">
              {t("usingConnection", { name: state.connectionName ?? "" })}
            </span>
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => trigger("disable")}
              >
                {pending ? t("working") : t("disable")}
              </Button>
            )}
          </div>
        ) : connections.length === 0 ? (
          <p className="text-muted-foreground">{t("noConnections")}</p>
        ) : (
          isOwner && (
            <div className="flex flex-wrap items-center gap-2">
              <Select value={choice} onValueChange={setChoice}>
                <SelectTrigger
                  size="sm"
                  className="w-56"
                  aria-label={t("connection")}
                >
                  <SelectValue placeholder={t("chooseConnection")}>
                    {chosen?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {connections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={pending || !choice || !state.acmeEmail}
                onClick={() => trigger("enable")}
              >
                {pending ? t("working") : t("enable")}
              </Button>
            </div>
          )
        )}

        {state.usedBy.length > 0 && (
          <p className="text-muted-foreground">
            {t("usedBy", { list: state.usedBy.join(", ") })}
          </p>
        )}
        <p className="text-muted-foreground">{t("tokenNote")}</p>
      </CardContent>
      <ConfirmDialog
        open={ask !== null}
        onOpenChange={(open) => {
          if (!open) setAsk(null)
        }}
        tone="neutral"
        title={t("recreateTitle")}
        description={t("recreateDescription")}
        confirmLabel={t("recreateConfirm")}
        onConfirm={async () => {
          const kind = ask
          setAsk(null)
          if (kind) run(kind)
        }}
      />
    </Card>
  )
}
