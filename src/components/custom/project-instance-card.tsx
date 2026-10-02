"use client"

import { Copy, ExternalLink } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Application } from "@/features/application/application.entity"
import type { ComposeApp } from "@/features/compose/compose.entity"
import type { ManagedDatabase } from "@/features/managed-database/managed-database.entity"
import { ENGINE_LABEL } from "@/features/managed-database/managed-database.entity"
import type { ProxyStatus } from "@/features/proxy/proxy.entity"
import { copyToClipboard } from "@/lib/clipboard"
import { cn } from "@/lib/utils"
import { domainTarget, portTarget, type AccessTarget } from "./instance-access"
import { useBrowserHost } from "./use-browser-host"

/** Links listed on a card before the rest collapse into "+N". */
const MAX_TARGETS = 2

type ProxyPorts = Pick<ProxyStatus, "httpPort" | "httpsPort"> | null

/** Domains an application has, as returned by `GET /applications?projectId=`. */
type ApplicationWithDomains = Application & {
  domains?: { host: string; https: boolean }[]
}

function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <Badge
      variant={
        status === "running"
          ? "default"
          : status === "error"
            ? "destructive"
            : "secondary"
      }
      className="shrink-0"
    >
      {label ?? status}
    </Badge>
  )
}

/**
 * The card is not one big `<a>`: links nested in a link are invalid HTML, and
 * a card now holds links of its own. The name is the link to the detail page
 * and stretches over the whole card (`after:absolute after:inset-0`), so a
 * click anywhere on the card still opens it; the access links sit above that
 * layer (`relative z-10`) and so never reach the stretched link.
 */
function InstanceCardShell({
  href,
  name,
  badge,
  subtitle,
  children,
}: {
  href: string
  name: string
  badge: React.ReactNode
  subtitle: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card className="relative h-full gap-3 transition-colors [--card-spacing:--spacing(5)] hover:bg-muted/50">
      <CardHeader className="gap-2">
        {/* min-w-0: a grid item otherwise grows to its longest name and pushes the badge out of the card. */}
        <div className="flex min-w-0 items-start justify-between gap-2">
          <CardTitle className="min-w-0 truncate">
            <Link
              href={href}
              className="outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {name}
            </Link>
          </CardTitle>
          {badge}
        </div>
        <CardDescription className="truncate font-mono text-xs">
          {subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">{children}</CardContent>
    </Card>
  )
}

const accessClass =
  "relative z-10 inline-flex max-w-full items-center gap-1 rounded-sm font-mono text-xs underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"

/**
 * Where an instance can be opened. Links only while it runs — a stopped or
 * failed one would lead to a dead page, so it lists the same addresses as dim
 * text instead.
 */
function AccessLinks({
  targets,
  live,
  stacked = false,
}: {
  targets: AccessTarget[]
  live: boolean
  /** One address per line — for stacks, whose entries carry a service name. */
  stacked?: boolean
}) {
  if (targets.length === 0) {
    return <p className="text-xs text-muted-foreground">Belum ada akses</p>
  }
  const shown = targets.slice(0, MAX_TARGETS)
  const rest = targets.slice(MAX_TARGETS)
  return (
    <div
      className={cn(
        "flex gap-x-4 gap-y-2",
        stacked ? "flex-col items-start" : "flex-wrap items-center"
      )}
    >
      {shown.map((t) => {
        const text = (
          <>
            {t.service && (
              <span className="shrink-0 whitespace-nowrap text-muted-foreground">
                {t.service} ·
              </span>
            )}
            <span className="min-w-0 truncate">{t.label}</span>
          </>
        )
        return live && t.url ? (
          <a
            key={t.key}
            href={t.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Buka ${t.label} di tab baru`}
            className={cn(accessClass, "text-foreground")}
          >
            {text}
            <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
          </a>
        ) : (
          <span
            key={t.key}
            className="inline-flex max-w-full items-center gap-1 font-mono text-xs text-muted-foreground"
          >
            {text}
          </span>
        )
      })}
      {rest.length > 0 && (
        <span
          className="font-mono text-xs text-muted-foreground"
          title={rest.map((t) => t.label).join(", ")}
        >
          +{rest.length}
        </span>
      )}
    </div>
  )
}

export function ApplicationInstanceCard({
  app,
  proxy,
}: {
  app: ApplicationWithDomains
  proxy: ProxyPorts
}) {
  const browserHost = useBrowserHost()
  // A remote server runs its own proxy and its ports live on that machine, not
  // on the one the panel is open on.
  const remote = app.serverId !== null
  let targets: AccessTarget[] = (app.domains ?? []).map((d) =>
    domainTarget(d.host, d.https, remote ? null : proxy)
  )
  if (targets.length === 0 && app.hostPort) {
    targets = remote
      ? [
          {
            key: `p:${app.hostPort}`,
            label: `:${app.hostPort} (server remote)`,
            url: "",
          },
        ]
      : [portTarget(browserHost, app.hostPort)]
  }
  return (
    <InstanceCardShell
      href={`/applications/${app.id}`}
      name={app.name}
      badge={<StatusBadge status={app.status} />}
      subtitle={
        app.sourceType === "image"
          ? `image · ${app.imageRef ?? ""}`
          : `${(app.gitUrl ?? "").replace(/^https?:\/\//, "")}#${app.gitBranch}`
      }
    >
      <AccessLinks targets={targets} live={app.status === "running"} />
    </InstanceCardShell>
  )
}

export function ComposeInstanceCard({
  stack,
  proxy,
}: {
  stack: ComposeApp
  proxy: ProxyPorts
}) {
  const browserHost = useBrowserHost()
  const targets = [
    ...stack.serviceDomains.map((d) =>
      domainTarget(d.host, d.https, proxy, d.service)
    ),
    ...stack.servicePorts.map((p) =>
      portTarget(browserHost, p.hostPort, p.service)
    ),
  ]
  return (
    <InstanceCardShell
      href={`/compose/${stack.id}`}
      name={stack.name}
      badge={
        <StatusBadge
          status={stack.status}
          label={stack.status === "deploying" ? "berjalan…" : undefined}
        />
      }
      subtitle={
        stack.source === "template"
          ? `template · ${stack.templateId}`
          : `${(stack.gitUrl ?? "").replace(/^https?:\/\//, "")}#${stack.gitBranch} · ${stack.composePath}`
      }
    >
      <AccessLinks
        targets={targets}
        live={stack.status === "running"}
        stacked
      />
    </InstanceCardShell>
  )
}

export function DatabaseInstanceCard({ db }: { db: ManagedDatabase }) {
  const browserHost = useBrowserHost()
  const address = db.hostPort ? `${browserHost ?? ""}:${db.hostPort}` : null
  async function copy() {
    if (!address) return
    const ok = await copyToClipboard(address)
    if (ok) toast.success(`${address} disalin`)
    else toast.error("Gagal menyalin alamat")
  }
  return (
    <InstanceCardShell
      href={`/databases/${db.id}`}
      name={db.name}
      badge={<StatusBadge status={db.status} />}
      subtitle={`${ENGINE_LABEL[db.engine]} ${db.imageTag}`}
    >
      {address ? (
        <button
          type="button"
          onClick={copy}
          aria-label={`Salin ${address}`}
          className={cn(accessClass, "cursor-pointer text-foreground")}
        >
          <span className="truncate">{address}</span>
          <Copy aria-hidden="true" className="size-3 shrink-0" />
        </button>
      ) : (
        <p className="text-xs text-muted-foreground">internal</p>
      )}
    </InstanceCardShell>
  )
}
