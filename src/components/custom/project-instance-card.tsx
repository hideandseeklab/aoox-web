"use client"

import { Copy, ExternalLink } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { toast } from "sonner"
import {
  ComposeSourceIcon,
  EngineIcon,
  SourceIcon,
} from "@/components/custom/brand-icon"
import { StatusDot } from "@/components/custom/status-dot"
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
  icon,
  badge,
  subtitle,
  children,
}: {
  href: string
  name: string
  icon: React.ReactNode
  badge: React.ReactNode
  subtitle: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card className="relative h-full gap-3 motion-safe:transition-colors [--card-spacing:--spacing(5)] hover:bg-muted/50">
      <CardHeader className="gap-2">
        {/* min-w-0: a grid item otherwise grows to its longest name and pushes the badge out of the card. */}
        <div className="flex min-w-0 items-start justify-between gap-2">
          <CardTitle className="flex min-w-0 items-center gap-2">
            <span className="text-muted-foreground">{icon}</span>
            <Link
              href={href}
              className="min-w-0 truncate outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
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
  const t = useTranslations("projects")
  if (targets.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">{t("instance.noAccess")}</p>
    )
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
      {shown.map((target) => {
        const text = (
          <>
            {target.service && (
              <span className="shrink-0 whitespace-nowrap text-muted-foreground">
                {target.service} ·
              </span>
            )}
            <span className="min-w-0 truncate">{target.label}</span>
          </>
        )
        return live && target.url ? (
          <a
            key={target.key}
            href={target.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("instance.openInNewTab", { label: target.label })}
            className={cn(accessClass, "text-foreground")}
          >
            {text}
            <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
          </a>
        ) : (
          <span
            key={target.key}
            className="inline-flex max-w-full items-center gap-1 font-mono text-xs text-muted-foreground"
          >
            {text}
          </span>
        )
      })}
      {rest.length > 0 && (
        <span
          className="font-mono text-xs text-muted-foreground"
          title={rest.map((r) => r.label).join(", ")}
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
  const t = useTranslations("projects")
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
            label: `:${app.hostPort} (${t("instance.remoteServer")})`,
            url: "",
          },
        ]
      : [portTarget(browserHost, app.hostPort, undefined, app.hostPortBind)]
  }
  return (
    <InstanceCardShell
      href={`/applications/${app.id}`}
      name={app.name}
      icon={
        <SourceIcon
          sourceType={app.sourceType}
          gitUrl={app.gitUrl}
          imageRef={app.imageRef}
          buildType={app.buildType}
        />
      }
      badge={<StatusDot status={app.status} showLabel />}
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
  const t = useTranslations("projects")
  const browserHost = useBrowserHost()
  const targets = [
    ...stack.serviceDomains.map((d) =>
      domainTarget(d.host, d.https, proxy, d.service)
    ),
    ...stack.servicePorts.map((p) =>
      portTarget(browserHost, p.hostPort, p.service, p.bind)
    ),
  ]
  return (
    <InstanceCardShell
      href={`/compose/${stack.id}`}
      name={stack.name}
      icon={<ComposeSourceIcon source={stack.source} gitUrl={stack.gitUrl} />}
      badge={
        <StatusDot
          status={stack.status}
          label={
            stack.status === "deploying"
              ? t("instance.composeDeploying")
              : undefined
          }
          showLabel
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
  const t = useTranslations("projects")
  const browserHost = useBrowserHost()
  const address = db.hostPort
    ? `${db.hostPortBind === "loopback" ? "127.0.0.1" : (browserHost ?? "")}:${db.hostPort}`
    : null
  async function copy() {
    if (!address) return
    const ok = await copyToClipboard(address)
    if (ok) toast.success(t("instance.copied", { address }))
    else toast.error(t("instance.copyFailed"))
  }
  return (
    <InstanceCardShell
      href={`/databases/${db.id}`}
      name={db.name}
      icon={<EngineIcon engine={db.engine} />}
      badge={<StatusDot status={db.status} showLabel />}
      subtitle={`${ENGINE_LABEL[db.engine]} ${db.imageTag}`}
    >
      {address ? (
        <button
          type="button"
          onClick={copy}
          aria-label={t("instance.copyAria", { address })}
          className={cn(accessClass, "cursor-pointer text-foreground")}
        >
          <span className="truncate">{address}</span>
          <Copy aria-hidden="true" className="size-3 shrink-0" />
        </button>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("instance.internal")}
        </p>
      )}
    </InstanceCardShell>
  )
}
