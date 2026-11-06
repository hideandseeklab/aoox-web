"use client"

import { Play, RefreshCw, Server as ServerIcon, Trash2 } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { ActionAlert } from "@/components/custom/action-alert"
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
  reinstallProxyAction,
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
  const runningTimeout = status.readTimeout ?? null
  const configuredTimeout = status.configuredReadTimeout ?? null
  // Only an API that reports the field can tell; undefined = older API, nothing to show.
  if (status.readTimeout !== undefined) {
    items.push({
      label: t("readTimeout"),
      value:
        runningTimeout === null
          ? t("readTimeoutDefault")
          : t("readTimeoutSeconds", { seconds: runningTimeout }),
    })
  }
  const timeoutMismatch =
    status.readTimeout !== undefined && runningTimeout !== configuredTimeout
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
        {timeoutMismatch && (
          <ActionAlert
            variant="warning"
            title={t("timeoutMismatch.title")}
            description={t("timeoutMismatch.body", {
              running:
                runningTimeout === null
                  ? t("readTimeoutDefault")
                  : t("readTimeoutSeconds", { seconds: runningTimeout }),
              configured:
                configuredTimeout === null
                  ? t("readTimeoutDefault")
                  : t("readTimeoutSeconds", { seconds: configuredTimeout }),
            })}
            actions={
              !canManage ? undefined : server ? (
                <Button variant="outline" asChild>
                  <Link href="/infra/servers">
                    <ServerIcon data-icon="inline-start" />
                    {t("empty.openServers")}
                  </Link>
                </Button>
              ) : (
                <ConfirmDialog
                  tone="neutral"
                  trigger={
                    <Button variant="outline">
                      <RefreshCw data-icon="inline-start" />
                      {t("reinstall")}
                    </Button>
                  }
                  title={t("reinstallConfirmTitle")}
                  description={t("reinstallConfirmDescription")}
                  confirmLabel={t("reinstall")}
                  onConfirm={async () => {
                    try {
                      const r = await reinstallProxyAction()
                      if (!r.ok) return r
                    } catch {
                      // Behind its own proxy the panel loses this response while the
                      // proxy restarts; the reinstall most likely ran: wait, then refresh.
                    }
                    await waitUntilPanelAnswers()
                    router.refresh()
                    return { ok: true }
                  }}
                />
              )
            }
          />
        )}
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

/** Polls the current page until it answers again (the proxy in front of the panel restarts). */
async function waitUntilPanelAnswers(): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    try {
      const res = await fetch(window.location.href, {
        method: "HEAD",
        cache: "no-store",
      })
      if (res.ok) return
    } catch {
      // still restarting
    }
  }
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
