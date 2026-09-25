"use client"

import { ExternalLink, Globe } from "lucide-react"
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
  const browserHost = useBrowserHost()
  const portSuffix = (https: boolean) => {
    const port = https ? proxy.httpsPort : proxy.httpPort
    return (https ? port === 443 : port === 80) ? "" : `:${port}`
  }

  if (domains.length === 0 && ports.length === 0) {
    return (
      <Alert>
        <Globe />
        <AlertTitle>Stack ini belum punya alamat</AlertTitle>
        <AlertDescription>
          Container stack hanya membuka port di dalam network Docker. Supaya
          bisa dibuka dari browser, atur di tab{" "}
          <span className="font-medium text-foreground">Pengaturan</span> →
          Akses: pakai <strong>domain</strong> lewat proxy (mis.{" "}
          <code>wordpress.localhost</code> untuk dev — <code>*.localhost</code>{" "}
          otomatis mengarah ke komputer ini) atau <strong>IP &amp; port</strong>{" "}
          (port host langsung, mis. <code>8080</code> → dibuka di{" "}
          <code>http://{browserHost ?? "<ip-server>"}:8080</code>), lalu{" "}
          <em>Deploy ulang</em>.
          {!proxy.running &&
            " Reverse proxy belum berjalan — untuk domain, provision dulu di Infrastruktur → Reverse proxy."}
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
      label: `${browserHost ?? "<ip-server>"}:${p.hostPort}`,
      url: `http://${browserHost ?? "localhost"}:${p.hostPort}`,
      needsProxy: false,
    })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Buka:</span>
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
          Proxy belum berjalan — domain belum bisa dibuka.
        </span>
      )}
    </div>
  )
}
