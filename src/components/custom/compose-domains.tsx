"use client"

import { ExternalLink, Plus, Trash2 } from "lucide-react"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
}: {
  appId: string
  domains: ComposeServiceDomain[]
  ports: ComposeServicePort[]
  proxy: ProxyStatus
  /** `service:port` pairs the template exposes (free text otherwise). */
  suggestions: { service: string; port: number; label: string }[]
}) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Akses</CardTitle>
        <CardDescription>
          Cara service dibuka dari luar — berlaku pada deploy berikutnya.
          <span className="block">
            <strong>Domain</strong>: lewat proxy (Traefik), arahkan DNS ke
            server ini.
            {!proxy.running &&
              " Proxy belum berjalan (Infrastruktur → Reverse proxy)."}
          </span>
          <span className="block">
            <strong>IP &amp; port</strong>: port dipublikasikan langsung di
            host, dibuka lewat{" "}
            <code>http://{browserHost ?? "<ip-server>"}:&lt;port&gt;</code>{" "}
            tanpa domain/proxy.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(domains.length > 0 || ports.length > 0) && (
          <ul className="divide-y rounded-md border text-sm">
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
                <Badge variant="secondary">domain</Badge>
                <Badge variant={d.https ? "default" : "outline"}>
                  {d.https ? "https" : "http"}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Hapus domain"
                  disabled={pending}
                  onClick={() => saveDomains(domains.filter((_, j) => j !== i))}
                >
                  <Trash2 />
                </Button>
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
                <Badge variant="secondary">IP &amp; port</Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Hapus port"
                  disabled={pending}
                  onClick={() => savePorts(ports.filter((_, j) => j !== i))}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList>
            <TabsTrigger value="domain">Domain</TabsTrigger>
            <TabsTrigger value="port">IP &amp; port</TabsTrigger>
          </TabsList>
        </Tabs>

        <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="space-y-1">
            <Label htmlFor="cd-service">Service</Label>
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
            <Label htmlFor="cd-port">Port container</Label>
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
                <Label htmlFor="cd-host">Host</Label>
                <Input
                  id="cd-host"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="app.example.com"
                />
              </div>
              <label className="mb-2 flex items-center gap-2 text-sm">
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
              <Label htmlFor="cd-host-port">Port host</Label>
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
            Tambah
          </Button>
        </form>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
