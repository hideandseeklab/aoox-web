"use client"

import { Globe, RefreshCw } from "lucide-react"
import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { ProxyStatus } from "@/features/proxy/proxy.entity"
import {
  provisionServerProxyAction,
  removeServerProxyAction,
  serverProxyStatusAction,
} from "@/features/server/server.actions"
import type { Server } from "@/features/server/server.entity"

/**
 * Traefik on a remote server: status (fetched on demand over SSH), ports,
 * ACME e-mail, provision/re-provision/remove. Apps deployed to the server
 * are routed by it, so their Domain tab works like on the host.
 */
export function ServerProxyPanel({ server }: { server: Server }) {
  const [status, setStatus] = useState<ProxyStatus | null>(null)
  const [httpPort, setHttpPort] = useState(String(server.proxyHttpPort))
  const [httpsPort, setHttpsPort] = useState(String(server.proxyHttpsPort))
  const [acmeEmail, setAcmeEmail] = useState(server.acmeEmail ?? "")
  const [acmeStaging, setAcmeStaging] = useState(server.acmeStaging)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const refresh = () =>
    start(async () => {
      setError(null)
      const r = await serverProxyStatusAction(server.id)
      if (r.ok) setStatus(r.data)
      else setError(r.error)
    })

  return (
    <div className="space-y-2 rounded-md border p-3 text-xs">
      <div className="flex items-center gap-2">
        <Globe className="size-3.5 text-muted-foreground" />
        <span className="font-medium">Proxy (Traefik) di server ini</span>
        {status &&
          (status.running ? (
            <Badge>running</Badge>
          ) : status.installed ? (
            <Badge variant="secondary">{status.state}</Badge>
          ) : (
            <Badge variant="outline">belum ada</Badge>
          ))}
        <span className="ms-auto" />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Cek status proxy"
          disabled={pending}
          onClick={refresh}
        >
          <RefreshCw />
        </Button>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => {
            setError(null)
            const r = await provisionServerProxyAction(server.id, {
              httpPort: Number(httpPort) || 80,
              httpsPort: Number(httpsPort) || 443,
              acmeEmail: acmeEmail.trim() || null,
              acmeStaging,
            })
            if (r.ok) setStatus(r.data)
            else setError(r.error)
          })
        }}
      >
        <div className="space-y-1">
          <Label htmlFor={`sp-http-${server.id}`}>HTTP</Label>
          <Input
            id={`sp-http-${server.id}`}
            type="number"
            min={1}
            max={65535}
            value={httpPort}
            onChange={(e) => setHttpPort(e.target.value)}
            className="h-8 w-20"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`sp-https-${server.id}`}>HTTPS</Label>
          <Input
            id={`sp-https-${server.id}`}
            type="number"
            min={1}
            max={65535}
            value={httpsPort}
            onChange={(e) => setHttpsPort(e.target.value)}
            className="h-8 w-20"
          />
        </div>
        <div className="min-w-40 flex-1 space-y-1">
          <Label htmlFor={`sp-acme-${server.id}`}>Email ACME (opsional)</Label>
          <Input
            id={`sp-acme-${server.id}`}
            type="email"
            value={acmeEmail}
            onChange={(e) => setAcmeEmail(e.target.value)}
            placeholder="admin@example.com"
            className="h-8"
          />
        </div>
        <label className="mb-1.5 flex items-center gap-1.5">
          <Switch checked={acmeStaging} onCheckedChange={setAcmeStaging} />
          staging
        </label>
        <Button type="submit" size="sm" disabled={pending}>
          {status?.installed ? "Provision ulang" : "Provision"}
        </Button>
        {status?.installed && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                if (!confirm("Hapus proxy di server ini?")) return
                setError(null)
                const r = await removeServerProxyAction(server.id)
                if (r.ok)
                  setStatus({
                    ...status,
                    installed: false,
                    running: false,
                    state: null,
                    containerId: null,
                  })
                else setError(r.error)
              })
            }
          >
            Hapus
          </Button>
        )}
      </form>
      {error && (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
