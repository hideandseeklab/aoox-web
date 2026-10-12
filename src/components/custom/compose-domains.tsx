"use client"

import { PathArrow } from "@/components/custom/arrows"
import { ExternalLink, Plus, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsTrigger } from "@/components/ui/tabs"
import { ScrollableTabsList } from "@/components/custom/scrollable-tabs-list"
import {
  updateServiceDomainsAction,
  updateServicePortsAction,
} from "@/features/compose/compose.actions"
import type {
  ComposeServiceDomain,
  ComposeServicePort,
} from "@/features/compose/compose.entity"
import type { ProxyStatus } from "@/features/proxy/proxy.entity"
import { useBrowserHost } from "./use-browser-host"

type Mode = "domain" | "port"

/**
 * How the stack's services are reached from outside: through the platform
 * proxy on a domain, or published straight on a host port (access by IP,
 * no DNS/proxy needed). Both are rendered into the override compose file
 * on deploy, so changes take effect on the next deploy.
 */
export function ComposeAccess({
  appId,
  domains,
  ports,
  proxy,
  suggestions,
  canEdit = true,
}: {
  appId: string
  domains: ComposeServiceDomain[]
  ports: ComposeServicePort[]
  proxy: ProxyStatus
  /** `service:port` pairs the template exposes (free text otherwise). */
  suggestions: { service: string; port: number; label: string }[]
  /** False for project viewers: list only, no add/remove. */
  canEdit?: boolean
}) {
  const t = useTranslations("compose")
  const tc = useTranslations("common")
  const [mode, setMode] = useState<Mode>(
    domains.length === 0 && ports.length > 0 ? "port" : "domain"
  )
  const [service, setService] = useState(suggestions[0]?.service ?? "")
  const [port, setPort] = useState(String(suggestions[0]?.port ?? ""))
  const [host, setHost] = useState("")
  const [https, setHttps] = useState(false)
  const [hostPort, setHostPort] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const browserHost = useBrowserHost()

  const saveDomains = (next: ComposeServiceDomain[]) =>
    start(async () => {
      setError(null)
      const r = await updateServiceDomainsAction(appId, next)
      if (!r.ok) setError(r.error)
      else {
        setHost("")
        setHttps(false)
      }
    })

  const savePorts = (next: ComposeServicePort[]) =>
    start(async () => {
      setError(null)
      const r = await updateServicePortsAction(appId, next)
      if (!r.ok) setError(r.error)
      else setHostPort("")
    })

  const portSuffix = (secure: boolean) => {
    const p = secure ? proxy.httpsPort : proxy.httpPort
    return (secure ? p === 443 : p === 80) ? "" : `:${p}`
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const p = Number(port)
    if (!service.trim() || !p) return
    if (mode === "domain") {
      if (!host.trim()) return
      saveDomains([
        ...domains,
        {
          service: service.trim(),
          port: p,
          host: host.trim().toLowerCase(),
          https,
        },
      ])
    } else {
      const hp = Number(hostPort)
      if (!hp) return
      savePorts([...ports, { service: service.trim(), port: p, hostPort: hp }])
    }
  }

  if (!canEdit && domains.length === 0 && ports.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("access.title")}</CardTitle>
        <CardDescription>
          {t("access.description")}
          <span className="block">
            {t.rich("access.domainLine", {
              b: (chunks) => <strong>{chunks}</strong>,
            })}
            {!proxy.running && (
              <>
                {" "}
                {t.rich("access.proxyOff", {
                  arrow: () => <PathArrow />,
                })}
              </>
            )}
          </span>
          <span className="block">
            {t.rich("access.ipPortLine", {
              host: browserHost ?? `<${t("accessHint.serverIpPlaceholder")}>`,
              port: "<port>",
              b: (chunks) => <strong>{chunks}</strong>,
              code: (chunks) => <code>{chunks}</code>,
            })}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(domains.length > 0 || ports.length > 0) && (
          <ul className="divide-y rounded-md border text-xs">
            {domains.map((d, i) => (
              <li
                key={`d:${d.service}:${d.port}:${d.host}`}
                className="flex items-center gap-3 px-3 py-2"
              >
                <span className="min-w-0 flex-1">
                  <a
                    href={`${d.https ? "https" : "http"}://${d.host}${portSuffix(d.https)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium hover:underline"
                  >
                    {d.host}
                    <ExternalLink className="size-3" />
                  </a>
                  <span className="block font-mono text-xs text-muted-foreground">
                    {d.service}:{d.port}
                  </span>
                </span>
                <Badge variant="secondary">{t("access.badgeDomain")}</Badge>
                <Badge variant={d.https ? "default" : "outline"}>
                  {d.https ? "https" : "http"}
                </Badge>
                {canEdit && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("access.removeDomain")}
                  disabled={pending}
                  onClick={() => saveDomains(domains.filter((_, j) => j !== i))}
                >
                  <Trash2 />
                </Button>
                )}
              </li>
            ))}
            {ports.map((p, i) => (
              <li
                key={`p:${p.service}:${p.port}:${p.hostPort}`}
                className="flex items-center gap-3 px-3 py-2"
              >
                <span className="min-w-0 flex-1">
                  {browserHost ? (
                    <a
                      href={`http://${browserHost}:${p.hostPort}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono font-medium hover:underline"
                    >
                      {browserHost}:{p.hostPort}
                      <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="font-mono font-medium">:{p.hostPort}</span>
                  )}
                  <span className="block font-mono text-xs text-muted-foreground">
                    {p.service}:{p.port}
                  </span>
                </span>
                <Badge variant="secondary">{t("access.ipPort")}</Badge>
                {canEdit && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("access.removePort")}
                  disabled={pending}
                  onClick={() => savePorts(ports.filter((_, j) => j !== i))}
                >
                  <Trash2 />
                </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {canEdit && (
        <>
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <ScrollableTabsList>
            <TabsTrigger value="domain">{t("access.tabDomain")}</TabsTrigger>
            <TabsTrigger value="port">{t("access.ipPort")}</TabsTrigger>
          </ScrollableTabsList>
        </Tabs>

        <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="space-y-1">
            <Label htmlFor="cd-service">{t("access.service")}</Label>
            <Input
              id="cd-service"
              value={service}
              onChange={(e) => setService(e.target.value)}
              list="cd-services"
              className="w-40 font-mono"
              placeholder="web"
            />
          </div>
          {/* Outside the field wrapper: a hidden datalist still counts as a
              child for `space-y-*`, which pushed the input up by one gap. */}
          <datalist id="cd-services">
            {suggestions.map((s) => (
              <option key={`${s.service}:${s.port}`} value={s.service}>
                {s.label}
              </option>
            ))}
          </datalist>
          <div className="space-y-1">
            <Label htmlFor="cd-port">{t("access.containerPort")}</Label>
            <Input
              id="cd-port"
              type="number"
              min={1}
              max={65535}
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="w-32"
            />
          </div>
          {mode === "domain" ? (
            <>
              <div className="min-w-48 flex-1 space-y-1">
                <Label htmlFor="cd-host">{tc("labels.host")}</Label>
                <Input
                  id="cd-host"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="app.example.com"
                />
              </div>
              <label className="mb-2 flex items-center gap-2 text-xs">
                <Switch
                  checked={https}
                  onCheckedChange={setHttps}
                  disabled={!proxy.acmeEmail}
                />
                HTTPS
              </label>
            </>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="cd-host-port">{t("access.hostPort")}</Label>
              <Input
                id="cd-host-port"
                type="number"
                min={1}
                max={65535}
                value={hostPort}
                onChange={(e) => setHostPort(e.target.value)}
                className="w-32"
                placeholder="8080"
              />
            </div>
          )}
          <Button type="submit" variant="outline" disabled={pending}>
            <Plus data-icon="inline-start" />
            {tc("actions.add")}
          </Button>
        </form>
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        </>
        )}
      </CardContent>
    </Card>
  )
}
