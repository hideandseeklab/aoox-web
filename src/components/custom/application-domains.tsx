"use client"

import { ExternalLink, Plus, Radar, Trash2 } from "lucide-react"
import { useState, useTransition } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  addDomainAction,
  checkDomainDnsAction,
  deleteDomainAction,
} from "@/features/application/application.actions"
import type {
  DnsCheck,
  Domain,
} from "@/features/application/application.entity"
import type { ProxyStatus } from "@/features/proxy/proxy.entity"

const DNS_LABEL: Record<DnsCheck["status"], string> = {
  ok: "ok",
  mismatch: "salah arah",
  unresolved: "belum ada",
  unknown: "?",
}

export function ApplicationDomains({
  applicationId,
  domains,
  proxy,
  deployed,
}: {
  applicationId: string
  domains: Domain[]
  proxy: ProxyStatus
  deployed: boolean
}) {
  const [host, setHost] = useState("")
  const [https, setHttps] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [dns, setDns] = useState<Record<string, DnsCheck>>({})

  const checkDns = (id: string) =>
    start(async () => {
      setError(null)
      const r = await checkDomainDnsAction(applicationId, id)
      if (r.ok) setDns((m) => ({ ...m, [id]: r.data }))
      else setError(r.error)
    })

  const portSuffix = (secure: boolean) => {
    const port = secure ? proxy.httpsPort : proxy.httpPort
    const isDefault = secure ? port === 443 : port === 80
    return isDefault ? "" : `:${port}`
  }

  return (
    <div className="max-w-2xl space-y-4">
      {!proxy.running && (
        <Alert>
          <AlertTitle>Proxy belum berjalan</AlertTitle>
          <AlertDescription>
            Domain baru berlaku setelah reverse proxy di-provision di halaman
            Settings.
          </AlertDescription>
        </Alert>
      )}
      {!deployed && (
        <p className="text-sm text-muted-foreground">
          Domain dipasang ke container saat aplikasi di-deploy.
        </p>
      )}

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => {
            setError(null)
            const r = await addDomainAction(applicationId, host, https)
            if (!r.ok) return setError(r.error)
            setHost("")
          })
        }}
      >
        <div className="min-w-64 flex-1 space-y-1">
          <Label htmlFor="domain-host">Hostname</Label>
          <Input
            id="domain-host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="app.example.com"
            required
          />
        </div>
        <div className="flex items-center gap-2 pb-1.5">
          <Switch
            id="domain-https"
            checked={https}
            onCheckedChange={setHttps}
            disabled={!proxy.acmeEmail}
          />
          <Label htmlFor="domain-https">HTTPS</Label>
        </div>
        <Button type="submit" disabled={pending || !host.trim()}>
          <Plus data-icon="inline-start" />
          Tambah
        </Button>
      </form>
      {!proxy.acmeEmail && (
        <p className="text-xs text-muted-foreground">
          HTTPS memerlukan <code>PROXY_ACME_EMAIL</code> di API.
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {domains.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Belum ada domain. Aplikasi hanya bisa diakses lewat port host.
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {domains.map((d) => {
            const url = `${d.https ? "https" : "http"}://${d.host}${portSuffix(d.https)}`
            const check = dns[d.id]
            return (
              <li key={d.id} className="space-y-1 px-4 py-2 text-sm">
                <div className="flex items-center gap-3">
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 items-center gap-1 font-mono hover:underline"
                  >
                    <span className="truncate">{d.host}</span>
                    <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                  </a>
                  {d.https && <Badge variant="secondary">https</Badge>}
                  {check && (
                    <Badge
                      variant={
                        check.status === "ok"
                          ? "default"
                          : check.status === "mismatch"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      DNS {DNS_LABEL[check.status]}
                    </Badge>
                  )}
                  <span className="ms-auto" />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Cek DNS ${d.host}`}
                    disabled={pending}
                    onClick={() => checkDns(d.id)}
                  >
                    <Radar />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Hapus ${d.host}`}
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await deleteDomainAction(applicationId, d.id)
                        if (!r.ok) setError(r.error)
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
                {check && (
                  <p className="text-xs text-muted-foreground">
                    {check.message}
                    {check.expectedSource === "detected" &&
                      " · IP publik dideteksi otomatis; set PUBLIC_IP di API bila keliru."}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
