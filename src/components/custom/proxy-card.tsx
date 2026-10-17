"use client"

import { Play, Server as ServerIcon, Trash2 } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import { DetailList, type DetailItem } from "@/components/custom/detail-list"
import { IllustratedEmptyState } from "@/components/custom/illustrated-empty-state"
import { ProxyIllustration } from "@/components/custom/illustrations/proxy-illustration"
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
  provisionProxyAction,
  removeProxyAction,
} from "@/features/proxy/proxy.actions"
import type { ProxyStatus } from "@/features/proxy/proxy.entity"
import type { Server } from "@/features/server/server.entity"
import { useRouter } from "@/lib/use-router"

const code = (c: React.ReactNode) => <code>{c}</code>

/**
 * Traefik on the selected proxy (the aoox host, or `server`). The host proxy is enabled here;
 * a remote server's proxy is installed with its ports under Remote servers, so this card only
 * shows it and links there. Removing the host proxy is in the page's danger zone.
 */
export function ProxyCard({
  status,
  canManage,
  server,
}: {
  status: ProxyStatus
  canManage: boolean
  server: Server | null
}) {
  const t = useTranslations("infra.proxyCard")
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const serversLink = (c: React.ReactNode) => (
    <Link href="/infra/servers" className="underline underline-offset-2">
      {c}
    </Link>
  )

  const provision = () =>
    start(async () => {
      setError(null)
      const r = await provisionProxyAction()
      if (!r.ok) return setError(r.error ?? t("failed"))
      router.refresh()
    })

  if (!status.installed) {
    return (
      <div className="space-y-3">
        <IllustratedEmptyState
          illustration={<ProxyIllustration />}
          title={t("empty.title")}
          description={
            server
              ? t("empty.remote")
              : canManage
                ? t("empty.body", {
                    httpPort: status.httpPort,
                    httpsPort: status.httpsPort,
                  })
                : t("empty.bodyMember")
          }
          actions={
            !canManage ? undefined : server ? (
              <Button variant="outline" asChild>
                <Link href="/infra/servers">
                  <ServerIcon data-icon="inline-start" />
                  {t("empty.openServers")}
                </Link>
              </Button>
            ) : (
              <Button disabled={pending} onClick={provision}>
                <Play data-icon="inline-start" />
                {pending ? t("provisioning") : t("provision")}
              </Button>
            )
          }
        />
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }

  const items: DetailItem[] = [
    // Plain values, not `mono`: a port needs no copy button.
    { label: t("httpPort"), value: <Port value={status.httpPort} /> },
    { label: t("httpsPort"), value: <Port value={status.httpsPort} /> },
    {
      label: t("acmeLabel"),
      value: status.acmeEmail
        ? t("acmeOn", { email: status.acmeEmail })
        : t("acmeOffValue"),
    },
  ]
  if (status.customCerts !== undefined) {
    items.push({
      label: t("files"),
      value: status.customCerts ? t("filesOn") : t("filesOff"),
    })
  }
  if (!status.running) {
    items.push({ label: t("container"), value: status.state ?? "—" })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
        <CardAction>
          {status.running ? (
            <Badge>{t("running")}</Badge>
          ) : (
            <Badge variant="destructive">{status.state}</Badge>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <DetailList items={items} columns={2} />
        {server ? (
          <p className="text-xs text-muted-foreground">
            {t.rich("remoteSettings", { link: serversLink })}
          </p>
        ) : (
          !status.acmeEmail && (
            <p className="text-xs text-muted-foreground">
              {t.rich("acmeOff", { code })}
            </p>
          )
        )}
      </CardContent>
    </Card>
  )
}

function Port({ value }: { value: number }) {
  return <code className="font-mono">{value}</code>
}

/** Danger zone action: removes the host proxy container (certificates stay in their volume). */
export function ProxyRemoveButton() {
  const t = useTranslations("infra.proxyCard")
  const router = useRouter()
  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive">
          <Trash2 data-icon="inline-start" />
          {t("remove")}
        </Button>
      }
      title={t("removeConfirmTitle")}
      description={t("removeConfirmDescription")}
      confirmLabel={t("remove")}
      onConfirm={async () => {
        const r = await removeProxyAction(false)
        if (r.ok) router.refresh()
        return r
      }}
    />
  )
}
