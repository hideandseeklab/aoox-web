"use client"

import { ExternalLink, Globe, Plus, Radar, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { EmptyState } from "@/components/custom/empty-state"
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
import { DomainMiddlewaresDialog } from "@/components/custom/domain-middlewares-dialog"
import {
  addDomainAction,
  checkDomainDnsAction,
  deleteDomainAction,
  setDomainCertificateAction,
} from "@/features/application/application.actions"
import type {
  DnsCheck,
  Domain,
  DomainMiddlewareOption,
} from "@/features/application/application.entity"
import type { Certificate } from "@/features/certificate/certificate.entity"
import {
  coversHost,
  daysLeft,
  EXPIRY_CLASS,
  expiryState,
} from "@/features/certificate/certificate.format"
import type { ProxyStatus } from "@/features/proxy/proxy.entity"

/** Select value for "no custom certificate": the proxy gets one from Let's Encrypt. */
const AUTO = "auto"

export function ApplicationDomains({
  applicationId,
  domains,
  certificates,
  middlewareOptions,
  canEdit,
  proxy,
  deployed,
}: {
  applicationId: string
  domains: Domain[]
  certificates: Certificate[]
  middlewareOptions: DomainMiddlewareOption[]
  /** False for viewers: the certificate choice is then read-only. */
  canEdit: boolean
  proxy: ProxyStatus
  deployed: boolean
}) {
  const t = useTranslations("applications")
  const tc = useTranslations("common")
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
          <AlertTitle>{t("domains.proxyStopped.title")}</AlertTitle>
          <AlertDescription>{t("domains.proxyStopped.body")}</AlertDescription>
        </Alert>
      )}
      {!deployed && (
        <p className="text-xs text-muted-foreground">
          {t("domains.notDeployed")}
        </p>
      )}
      {justAutoProvisioned && (
        <Alert variant="destructive" className="max-w-3xl">
          <AlertTitle>{t("domains.autoProvisioned.title")}</AlertTitle>
          <AlertDescription>
            <p>
              {t.rich("domains.autoProvisioned.intro", {
                code: (chunks) => <code>{chunks}</code>,
                host: justAutoProvisioned,
              })}
            </p>
            <ol className="ml-4 list-decimal space-y-1">
              <li>
                {t.rich("domains.autoProvisioned.dns", {
                  code: (chunks) => <code>{chunks}</code>,
                  host: justAutoProvisioned,
                })}
              </li>
              <li>
                {t.rich("domains.autoProvisioned.ports", {
                  code: (chunks) => <code>{chunks}</code>,
                })}
              </li>
              <li>{t("domains.autoProvisioned.cert")}</li>
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
          <Label htmlFor="domain-host">{t("domains.form.hostname")}</Label>
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
            <Label htmlFor="domain-cert">{t("domains.form.certificate")}</Label>
            <Select value={certId} onValueChange={setCertId}>
              <SelectTrigger id="domain-cert" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO}>{t("domains.certAuto")}</SelectItem>
                {certificates.map((c) => {
                  const covers = !host.trim() || coversHost(c, host.trim())
                  return (
                    <SelectItem key={c.id} value={c.id} disabled={!covers}>
                      {c.name}
                      {!covers && ` · ${t("domains.notCovered")}`}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button type="submit" disabled={pending || !host.trim()}>
          <Plus data-icon="inline-start" />
          {tc("actions.add")}
        </Button>
      </form>
      {!proxy.acmeEmail && (
        <p className="text-xs text-muted-foreground">
          {t.rich("domains.httpsNeedsEmail", {
            code: (chunks) => <code>{chunks}</code>,
          })}
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      {domains.length === 0 ? (
        <EmptyState icon={Globe} compact>
          {t("domains.empty")}
        </EmptyState>
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
                      {t("domains.dns.badge", { status: t(`domains.dns.${check.status}`) })}
                    </Badge>
                  )}
                  <span className="ms-auto" />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("domains.dns.checkAria", { host: d.host })}
                    disabled={pending}
                    onClick={() => checkDns(d.id)}
                  >
                    <Radar />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("domains.deleteAria", { host: d.host })}
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
                {(canEdit || (d.middlewares ?? []).length > 0) && (
                  <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                    <span>{t("domains.middleware")}</span>
                    {(d.middlewares ?? []).length === 0 ? (
                      <span>{tc("states.none").toLowerCase()}</span>
                    ) : (
                      (d.middlewares ?? []).map((m) => (
                        <Badge key={m} variant="outline" className="font-mono">
                          {m}
                        </Badge>
                      ))
                    )}
                    {canEdit && (
                      <DomainMiddlewaresDialog
                        applicationId={applicationId}
                        domain={d}
                        options={middlewareOptions}
                      />
                    )}
                  </div>
                )}
                {check && (
                  <p className="text-xs text-muted-foreground">
                    {check.message}
                    {check.expectedSource === "detected" &&
                      ` · ${t("domains.dns.detected")}`}
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
  const t = useTranslations("applications")
  const current = certificates.find((c) => c.id === domain.certificateId)
  const state = current ? expiryState(current.notAfter) : null
  const expiryWhen = (notAfter: string) => {
    const days = daysLeft(notAfter)
    return days === 0
      ? t("domains.expiry.today")
      : t("domains.expiry.daysLeft", { days })
  }
  const label = domain.certificateName ?? current?.name ?? null

  return (
    <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
      <span>{t("domains.form.certificate")}</span>
      {canEdit && (certificates.length > 0 || domain.certificateId) ? (
        <Select
          value={domain.certificateId ?? AUTO}
          onValueChange={onChange}
          disabled={pending}
        >
          <SelectTrigger
            size="sm"
            className="w-56"
            aria-label={t("domains.certFor", { host: domain.host })}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={AUTO}>{t("domains.certAuto")}</SelectItem>
            {certificates.map((c) => {
              const covers = coversHost(c, domain.host)
              return (
                <SelectItem key={c.id} value={c.id} disabled={!covers}>
                  {c.name}
                  {!covers && ` · ${t("domains.notCovered")}`}
                </SelectItem>
              )
            })}
            {domain.certificateId && !current && (
              <SelectItem value={domain.certificateId} disabled>
                {label ?? t("domains.customCert")}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      ) : (
        <span className="text-foreground">
          {label ?? t("domains.certAuto")}
        </span>
      )}
      {current && state && state !== "ok" && (
        <span
          className={`rounded-full border px-2 py-0.5 ${EXPIRY_CLASS[state]}`}
        >
          {state === "expired"
            ? t("domains.expiry.expired")
            : t("domains.expiry.warn", {
                when: expiryWhen(current.notAfter),
              })}
        </span>
      )}
    </div>
  )
}
