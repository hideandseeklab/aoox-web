"use client"

import { PathArrow } from "@/components/custom/arrows"
import { ExternalLink, Globe } from "lucide-react"
import { useTranslations } from "next-intl"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type {
  ComposeServiceDomain,
  ComposeServicePort,
} from "@/features/compose/compose.entity"
import type { ProxyStatus } from "@/features/proxy/proxy.entity"
import { useBrowserHost } from "./use-browser-host"

/**
 * Answers "where do I open this?" on the compose Deploy tab: a stack's
 * containers only expose ports inside the Docker network, so without a
 * domain routed by the proxy or a published host port there is nothing
 * to click.
 */
export function ComposeAccessHint({
  domains,
  ports,
  proxy,
  running,
}: {
  domains: ComposeServiceDomain[]
  ports: ComposeServicePort[]
  proxy: ProxyStatus
  running: boolean
}) {
  const t = useTranslations("compose")
  const browserHost = useBrowserHost()
  const hostLabel = browserHost ?? `<${t("accessHint.serverIpPlaceholder")}>`
  const portSuffix = (https: boolean) => {
    const port = https ? proxy.httpsPort : proxy.httpPort
    return (https ? port === 443 : port === 80) ? "" : `:${port}`
  }

  if (domains.length === 0 && ports.length === 0) {
    return (
      <Alert>
        <Globe />
        <AlertTitle>{t("accessHint.noAddressTitle")}</AlertTitle>
        <AlertDescription>
          {t.rich("accessHint.noAddressBody", {
            host: hostLabel,
            tab: (chunks) => (
              <span className="font-medium text-foreground">{chunks}</span>
            ),
            b: (chunks) => <strong>{chunks}</strong>,
            i: (chunks) => <em>{chunks}</em>,
            code: (chunks) => <code>{chunks}</code>,
            arrow: () => <PathArrow />,
          })}
          {!proxy.running && (
            <>
              {" "}
              {t.rich("accessHint.proxyOff", {
                arrow: () => <PathArrow />,
              })}
            </>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  const links = [
    ...domains.map((d) => ({
      key: `d:${d.service}:${d.host}`,
      service: d.service,
      label: d.host,
      url: `${d.https ? "https" : "http"}://${d.host}${portSuffix(d.https)}`,
      needsProxy: true,
    })),
    ...ports.map((p) => ({
      key: `p:${p.service}:${p.hostPort}`,
      service: p.service,
      label: `${hostLabel}:${p.hostPort}`,
      url: `http://${browserHost ?? "localhost"}:${p.hostPort}`,
      needsProxy: false,
    })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted-foreground">{t("accessHint.open")}</span>
      {links.map((l) => (
        <Button
          key={l.key}
          asChild
          variant="outline"
          size="sm"
          disabled={!running || (l.needsProxy && !proxy.running)}
        >
          <a href={l.url} target="_blank" rel="noreferrer">
            <span className="text-muted-foreground">{l.service} ·</span>{" "}
            {l.label}
            <ExternalLink data-icon="inline-end" />
          </a>
        </Button>
      ))}
      {!proxy.running && domains.length > 0 && (
        <span className="text-xs text-destructive">
          {t("accessHint.proxyDown")}
        </span>
      )}
    </div>
  )
}
