"use client"

import { ExternalLink, Plus, Radar, Trash2 } from "lucide-react"
import { useState, useTransition } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  addDomainAction,
  checkDomainDnsAction,
  deleteDomainAction,
  setDomainCertificateAction,
} from "@/features/application/application.actions"
import type {
  DnsCheck,
  Domain,
} from "@/features/application/application.entity"
import type { Certificate } from "@/features/certificate/certificate.entity"
import {
  coversHost,
  EXPIRY_CLASS,
  expiryLabel,
  expiryState,
} from "@/features/certificate/certificate.format"
import type { ProxyStatus } from "@/features/proxy/proxy.entity"

/** Select value for "no custom certificate": the proxy gets one from Let's Encrypt. */
const AUTO = "auto"

const DNS_LABEL: Record<DnsCheck["status"], string> = {
  ok: "ok",
  mismatch: "salah arah",
  unresolved: "belum ada",
  unknown: "?",
}

export function ApplicationDomains({
  applicationId,
  domains,
  certificates,
  canEdit,
  proxy,
  deployed,
}: {
  applicationId: string
  domains: Domain[]
  certificates: Certificate[]
  /** False for viewers: the certificate choice is then read-only. */
  canEdit: boolean
  proxy: ProxyStatus
  deployed: boolean
}) {
  const [host, setHost] = useState("")
  const [https, setHttps] = useState(false)
  const [certId, setCertId] = useState(AUTO)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [dns, setDns] = useState<Record<string, DnsCheck>>({})
  const [justAutoProvisioned, setJustAutoProvisioned] = useState<string | null>(
    null
  )

  const checkDns = (id: string) =>
    start(async () => {
      setError(null)
      const r = await checkDomainDnsAction(applicationId, id)
      if (r.ok) setDns((m) => ({ ...m, [id]: r.data }))
      else setError(r.error)
    })

  const setCertificate = (domainId: string, value: string) =>
    start(async () => {
      setError(null)
      const r = await setDomainCertificateAction(
        applicationId,
        domainId,
        value === AUTO ? null : value
      )
      if (!r.ok) setError(r.error)
    })

  const portSuffix = (secure: boolean) => {
    const port = secure ? proxy.httpsPort : proxy.httpPort
    const isDefault = secure ? port === 443 : port === 80
    return isDefault ? "" : `:${port}`
  }

  return (
    <div className="space-y-4">
      {!proxy.running && (
        <Alert className="max-w-3xl">
          <AlertTitle>Proxy belum berjalan</AlertTitle>
          <AlertDescription>
            Domain baru berlaku setelah reverse proxy diaktifkan di halaman
            Settings.
          </AlertDescription>
        </Alert>
      )}
      {!deployed && (
        <p className="text-xs text-muted-foreground">
          Domain dipasang ke container saat aplikasi di-deploy.
        </p>
      )}
      {justAutoProvisioned && (
        <Alert variant="destructive" className="max-w-3xl">
          <AlertTitle>
            Reverse proxy belum aktif — sudah dinyalakan otomatis
          </AlertTitle>
          <AlertDescription>
            <p>
              Proxy (Traefik) belum jalan sebelum ini, jadi sudah diaktifkan
              otomatis untuk domain <code>{justAutoProvisioned}</code>. Cek satu
              per satu kalau domain belum bisa diakses setelah beberapa menit:
            </p>
            <ol className="ml-4 list-decimal space-y-1">
              <li>
                DNS A record <code>{justAutoProvisioned}</code> sudah mengarah
                ke IP server ini.
              </li>
              <li>
                Port <code>80</code> dan <code>443</code> terbuka untuk publik —
                baik firewall OS (<code>ufw</code>) maupun firewall/security
                group dari provider VPS/server kamu.
              </li>
              <li>
                Kalau meminta HTTPS: sertifikat (Let&apos;s Encrypt) baru
                diterbitkan Traefik saat pertama kali domain diakses, butuh
                beberapa detik sampai semenit — dan hanya terbit kalau email
                ACME sudah diisi (host: Domain panel; server remote: pengaturan
                server).
              </li>
            </ol>
          </AlertDescription>
        </Alert>
      )}

      <form
        className="flex max-w-3xl flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => {
            setError(null)
            const r = await addDomainAction(
              applicationId,
              host,
              https,
              https && certId !== AUTO ? certId : null
            )
            if (!r.ok) return setError(r.error)
            setJustAutoProvisioned(r.data.proxyAutoProvisioned ? host : null)
            setHost("")
            setCertId(AUTO)
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
        {https && certificates.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor="domain-cert">Sertifikat</Label>
            <Select value={certId} onValueChange={setCertId}>
              <SelectTrigger id="domain-cert" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO}>
                  Otomatis (Let&apos;s Encrypt)
                </SelectItem>
                {certificates.map((c) => {
                  const covers = !host.trim() || coversHost(c, host.trim())
                  return (
                    <SelectItem key={c.id} value={c.id} disabled={!covers}>
                      {c.name}
                      {!covers && " · tidak mencakup host"}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        )}
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
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      {domains.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
          Belum ada domain. Aplikasi hanya bisa diakses lewat port host.
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {domains.map((d) => {
            const url = `${d.https ? "https" : "http"}://${d.host}${portSuffix(d.https)}`
            const check = dns[d.id]
            return (
              <li key={d.id} className="space-y-1 px-4 py-2 text-xs">
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
                {d.https && (
                  <CertificateRow
                    domain={d}
                    certificates={certificates}
                    canEdit={canEdit}
                    pending={pending}
                    onChange={(value) => setCertificate(d.id, value)}
                  />
                )}
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

/** Which SSL certificate an https domain uses, with a picker (developer+) and an expiry warning. */
function CertificateRow({
  domain,
  certificates,
  canEdit,
  pending,
  onChange,
}: {
  domain: Domain
  certificates: Certificate[]
  canEdit: boolean
  pending: boolean
  onChange: (value: string) => void
}) {
  const current = certificates.find((c) => c.id === domain.certificateId)
  const state = current ? expiryState(current.notAfter) : null
  const label = domain.certificateName ?? current?.name ?? null

  return (
    <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
      <span>Sertifikat</span>
      {canEdit && (certificates.length > 0 || domain.certificateId) ? (
        <Select
          value={domain.certificateId ?? AUTO}
          onValueChange={onChange}
          disabled={pending}
        >
          <SelectTrigger
            size="sm"
            className="w-56"
            aria-label={`Sertifikat untuk ${domain.host}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={AUTO}>Otomatis (Let&apos;s Encrypt)</SelectItem>
            {certificates.map((c) => {
              const covers = coversHost(c, domain.host)
              return (
                <SelectItem key={c.id} value={c.id} disabled={!covers}>
                  {c.name}
                  {!covers && " · tidak mencakup host"}
                </SelectItem>
              )
            })}
            {domain.certificateId && !current && (
              <SelectItem value={domain.certificateId} disabled>
                {label ?? "sertifikat kustom"}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      ) : (
        <span className="text-foreground">
          {label ?? "Otomatis (Let's Encrypt)"}
        </span>
      )}
      {current && state && state !== "ok" && (
        <span
          className={`rounded-full border px-2 py-0.5 ${EXPIRY_CLASS[state]}`}
        >
          {state === "expired"
            ? "Sertifikat kedaluwarsa"
            : `Sertifikat ${expiryLabel(current.notAfter)}`}
        </span>
      )}
    </div>
  )
}
