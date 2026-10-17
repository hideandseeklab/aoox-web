"use client"

import { TriangleAlert } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
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
import { useRouter } from "@/lib/use-router"

/**
 * ACME DNS-01 for one proxy (the aoox host or a remote server): binds a DNS provider
 * connection so the proxy gets a second certificate resolver (`le-dns`). Enabling or
 * disabling recreates a running proxy, so it asks first. Only the owner can change it.
 * The proxy is chosen once at the top of the page (`?server=`).
 */
export function ProxyDnsCard({
  state,
  connections,
  serverId,
  isOwner,
}: {
  state: ProxyDnsState
  connections: DnsConnection[]
  serverId: string | null
  isOwner: boolean
}) {
  const t = useTranslations("dns.proxy")
  const router = useRouter()
  const [pending, start] = useTransition()
  const [choice, setChoice] = useState(
    state.connectionId ?? connections[0]?.id ?? ""
  )
  const [ask, setAsk] = useState<null | "enable" | "disable">(null)

  const bound = state.connectionId !== null
  const running = state.proxy === "running"
  const chosen = connections.find((c) => c.id === choice)

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
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
        <CardAction>
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
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {!state.acmeEmail && (
          <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
            <TriangleAlert />
            <AlertDescription className="text-amber-700/90 dark:text-amber-400/90">
              {t("needsEmail")}
            </AlertDescription>
          </Alert>
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
          <p className="text-muted-foreground">
            {t.rich("noConnections", {
              link: (c) => (
                <Link
                  href="/integrations/dns"
                  className="text-foreground underline underline-offset-2"
                >
                  {c}
                </Link>
              ),
            })}
          </p>
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
                <SelectContent position="popper">
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
        <p className="border-t pt-3 text-muted-foreground">{t("tokenNote")}</p>
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
