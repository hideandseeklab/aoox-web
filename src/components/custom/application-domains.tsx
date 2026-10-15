"use client"

import {
  ExternalLink,
  Globe,
  Radar,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { SectionHeader } from "@/components/custom/section-header"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { AddDialog } from "@/components/custom/add-dialog"
import {
  DataActions,
  DataActionsHead,
  DataCell,
  DataHead,
  DataRow,
  DataTable,
  DataTableBody,
  DataTableHeader,
  IconButton,
} from "@/components/custom/data-table"
import { EmptyState } from "@/components/custom/empty-state"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
import { ExposedPortAlert } from "@/components/custom/exposed-port-alert"
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
import {
  syncDomainDnsAction,
  updateDomainDnsAction,
} from "@/features/dns/dns.actions"
import type { CertMode, DnsConnection } from "@/features/dns/dns.entity"
import type { ProxyStatus } from "@/features/proxy/proxy.entity"

/** Select value for "no custom certificate": the proxy gets one from Let's Encrypt. */
const AUTO = "auto"
/** Select value for "no DNS connection": the user manages DNS. */
const MANUAL = "manual"

/** Parent domain a wildcard certificate would cover, or null when there is none. */
function wildcardBase(host: string): string | null {
  const labels = host.trim().toLowerCase().split(".")
  return labels.length >= 3 ? labels.slice(1).join(".") : null
}

export function ApplicationDomains({
  applicationId,
  domains,
  certificates,
  middlewareOptions,
  canEdit,
  proxy,
  deployed,
  containerPort,
  exposedPorts,
  dnsConnections,
  proxyDnsEnabled,
}: {
  applicationId: string
  domains: Domain[]
  certificates: Certificate[]
  middlewareOptions: DomainMiddlewareOption[]
  /** False for viewers: the certificate choice is then read-only. */
  canEdit: boolean
  proxy: ProxyStatus
  deployed: boolean
  containerPort: number
  /** Ports the image declares with EXPOSE (null = unknown). */
  exposedPorts?: number[] | null
  /** DNS provider connections a domain can use to get its record created. */
  dnsConnections: DnsConnection[]
  /** The proxy serving this application has DNS-01 (wildcard certificates). */
  proxyDnsEnabled: boolean
}) {
  const t = useTranslations("applications")
  const td = useTranslations("dns.domain")
  const [dnsConn, setDnsConn] = useState(MANUAL)
  const [dnsProxied, setDnsProxied] = useState(false)
  const [dnsOverwrite, setDnsOverwrite] = useState(false)
  const [certMode, setCertMode] = useState<CertMode>("http")
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

  const resetForm = () => {
    setHost("")
    setHttps(false)
    setCertId(AUTO)
    setCertMode("http")
    setDnsConn(MANUAL)
    setDnsProxied(false)
    setDnsOverwrite(false)
  }

  const addDomain = async () => {
    const r = await addDomainAction(
      applicationId,
      host,
      https,
      https && certId !== AUTO ? certId : null,
      {
        certMode: https && certId === AUTO ? certMode : "http",
        dnsConnectionId: dnsConn === MANUAL ? null : dnsConn,
        dnsProxied,
        dnsOverwrite,
      }
    )
    if (!r.ok) return r
    if (r.data.dnsWarning) {
      toast.warning(td("addedWithWarning", { message: r.data.dnsWarning }))
    }
    setJustAutoProvisioned(r.data.proxyAutoProvisioned ? host : null)
    return r
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t("domains.section.title")}
        description={t("domains.section.description", {
          count: domains.length,
        })}
        action={
          canEdit && (
            <AddDialog
              title={t("domains.add.title")}
              description={t("domains.add.description")}
              submitDisabled={!host.trim()}
              onOpenChange={resetForm}
              onSubmit={addDomain}
            >
              <div className="space-y-1">
                <Label htmlFor="domain-host">
                  {t("domains.form.hostname")}
                </Label>
                <Input
                  id="domain-host"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="app.example.com"
                  className="font-mono"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="domain-https"
                  checked={https}
                  onCheckedChange={setHttps}
                  disabled={!proxy.acmeEmail}
                />
                <Label htmlFor="domain-https">HTTPS</Label>
              </div>
              {!proxy.acmeEmail && (
                <p className="text-xs text-muted-foreground">
                  {t.rich("domains.httpsNeedsEmail", {
                    code: (chunks) => <code>{chunks}</code>,
                  })}
                </p>
              )}
              {https && certificates.length > 0 && (
                <div className="space-y-1">
                  <Label htmlFor="domain-cert">
                    {t("domains.form.certificate")}
                  </Label>
                  <Select value={certId} onValueChange={setCertId}>
                    <SelectTrigger id="domain-cert" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value={AUTO}>
                        {t("domains.certAuto")}
                      </SelectItem>
                      {certificates.map((c) => {
                        const covers =
                          !host.trim() || coversHost(c, host.trim())
                        return (
                          <SelectItem
                            key={c.id}
                            value={c.id}
                            disabled={!covers}
                          >
                            {c.name}
                            {!covers && ` · ${t("domains.notCovered")}`}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {https && certId === AUTO && proxyDnsEnabled && (
                <div className="space-y-1">
                  <Label htmlFor="domain-certmode">{td("certLabel")}</Label>
                  <Select
                    value={certMode}
                    onValueChange={(v) => setCertMode(v as CertMode)}
                  >
                    <SelectTrigger id="domain-certmode" className="w-full">
                      <SelectValue>
                        {certModeLabelWith(td, certMode, host.trim())}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="http">{td("certHttp")}</SelectItem>
                      <SelectItem value="dns">{td("certDns")}</SelectItem>
                      <SelectItem
                        value="dns-wildcard"
                        disabled={!wildcardBase(host.trim())}
                      >
                        {certModeLabelWith(td, "dns-wildcard", host.trim())}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {dnsConnections.length > 0 && (
                <div className="space-y-1">
                  <Label htmlFor="domain-dns">{td("manageLabel")}</Label>
                  <Select value={dnsConn} onValueChange={setDnsConn}>
                    <SelectTrigger id="domain-dns" className="w-full">
                      <SelectValue>
                        {dnsConn === MANUAL
                          ? td("manual")
                          : td("viaConnection", {
                              name:
                                dnsConnections.find((c) => c.id === dnsConn)
                                  ?.name ?? "",
                            })}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value={MANUAL}>{td("manual")}</SelectItem>
                      {dnsConnections.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {td("viaConnection", { name: c.name })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {dnsConn !== MANUAL && (
                <>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="domain-dns-proxied"
                      checked={dnsProxied}
                      onCheckedChange={setDnsProxied}
                    />
                    <Label htmlFor="domain-dns-proxied">{td("proxied")}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="domain-dns-overwrite"
                      checked={dnsOverwrite}
                      onCheckedChange={setDnsOverwrite}
                    />
                    <Label htmlFor="domain-dns-overwrite">
                      {td("overwrite")}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {td("proxiedHelp")}
                  </p>
                </>
              )}
            </AddDialog>
          )
        }
      />
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
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      <ExposedPortAlert
        applicationId={applicationId}
        containerPort={containerPort}
        exposedPorts={exposedPorts}
        canEdit={canEdit}
        className="max-w-3xl"
      />

      {domains.length === 0 ? (
        <EmptyState icon={Globe} compact>
          {t("domains.empty")}
        </EmptyState>
      ) : (
        <DataTable minWidth="min-w-[62rem]">
          <DataTableHeader>
            <DataHead>{t("domains.columns.host")}</DataHead>
            <DataHead>{t("domains.columns.certificate")}</DataHead>
            <DataHead>{t("domains.columns.dns")}</DataHead>
            <DataHead>{t("domains.columns.middleware")}</DataHead>
            <DataActionsHead label={tc("labels.actions")} />
          </DataTableHeader>
          <DataTableBody>
            {domains.map((d) => {
              const url = `${d.https ? "https" : "http"}://${d.host}${portSuffix(d.https)}`
              const check = dns[d.id]
              const showCertMode =
                d.https &&
                !d.certificateId &&
                (proxyDnsEnabled || (d.certMode ?? "http") !== "http")
              const showDns =
                (canEdit && dnsConnections.length > 0) || !!d.dnsConnectionId
              return (
                <DataRow key={d.id} className="align-top">
                  <DataCell className="max-w-72">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
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
                          {t("domains.dns.badge", {
                            status: t(`domains.dns.${check.status}`),
                          })}
                        </Badge>
                      )}
                    </div>
                    {check && (
                      <p className="mt-1 text-wrap text-muted-foreground">
                        {check.message}
                        {check.expectedSource === "detected" &&
                          ` · ${t("domains.dns.detected")}`}
                      </p>
                    )}
                    {(d.conflicts ?? []).length > 0 && (
                      <div className="mt-1 max-w-80 space-y-1">
                        {(d.conflicts ?? []).map((c) => (
                          <p
                            key={c.containerId}
                            className="flex items-start gap-1.5 text-wrap text-amber-700 dark:text-amber-400"
                            role="status"
                          >
                            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                            <span>
                              {t.rich(
                                c.orphan
                                  ? "domains.conflict.orphan"
                                  : "domains.conflict.other",
                                {
                                  name: c.containerName,
                                  code: (chunks) => <code>{chunks}</code>,
                                  link: (chunks) => (
                                    <Link
                                      href="/infra/docker"
                                      className="underline underline-offset-2"
                                    >
                                      {chunks}
                                    </Link>
                                  ),
                                }
                              )}
                            </span>
                          </p>
                        ))}
                      </div>
                    )}
                  </DataCell>
                  <DataCell>
                    {d.https ? (
                      <div className="space-y-1.5">
                        <CertificateCell
                          domain={d}
                          certificates={certificates}
                          canEdit={canEdit}
                          pending={pending}
                          onChange={(value) => setCertificate(d.id, value)}
                        />
                        {showCertMode && (
                          <CertModeCell
                            domain={d}
                            canEdit={canEdit}
                            pending={pending}
                            onChange={(mode) =>
                              start(async () => {
                                setError(null)
                                const r = await updateDomainDnsAction(
                                  applicationId,
                                  d.id,
                                  { certMode: mode }
                                )
                                if (!r.ok) setError(r.error)
                              })
                            }
                          />
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </DataCell>
                  <DataCell>
                    {showDns ? (
                      <DnsCell
                        domain={d}
                        connections={dnsConnections}
                        canEdit={canEdit}
                        pending={pending}
                        onPatch={(patch) =>
                          start(async () => {
                            setError(null)
                            const r = await updateDomainDnsAction(
                              applicationId,
                              d.id,
                              patch
                            )
                            if (!r.ok) setError(r.error)
                          })
                        }
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </DataCell>
                  <DataCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(d.middlewares ?? []).length === 0 && !canEdit && (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {(d.middlewares ?? []).map((m) => (
                        <Badge key={m} variant="outline" className="font-mono">
                          {m}
                        </Badge>
                      ))}
                      {canEdit && (
                        <DomainMiddlewaresDialog
                          applicationId={applicationId}
                          domain={d}
                          options={middlewareOptions}
                        />
                      )}
                    </div>
                  </DataCell>
                  <DataActions>
                    <IconButton
                      label={t("domains.dns.checkAria", { host: d.host })}
                      disabled={pending}
                      onClick={() => checkDns(d.id)}
                    >
                      <Radar />
                    </IconButton>
                    {canEdit && d.dnsConnectionId && (
                      <IconButton
                        label={td("syncAria", { host: d.host })}
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            setError(null)
                            const r = await syncDomainDnsAction(
                              applicationId,
                              d.id,
                              false
                            )
                            if (!r.ok) setError(r.error)
                          })
                        }
                      >
                        <RefreshCw />
                      </IconButton>
                    )}
                    {canEdit && (
                      <IconButton
                        label={t("domains.deleteAria", { host: d.host })}
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            const r = await deleteDomainAction(
                              applicationId,
                              d.id
                            )
                            if (!r.ok) setError(r.error)
                          })
                        }
                      >
                        <Trash2 />
                      </IconButton>
                    )}
                  </DataActions>
                </DataRow>
              )
            })}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  )
}

/** Which SSL certificate an https domain uses, with a picker (developer+) and an expiry warning. */
function CertificateCell({
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
    <div className="flex flex-wrap items-center gap-2">
      {canEdit && (certificates.length > 0 || domain.certificateId) ? (
        <Select
          value={domain.certificateId ?? AUTO}
          onValueChange={onChange}
          disabled={pending}
        >
          <SelectTrigger
            size="sm"
            className="w-44"
            aria-label={t("domains.certFor", { host: domain.host })}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
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
        <span>{label ?? t("domains.certAuto")}</span>
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

type DnsT = ReturnType<typeof useTranslations>

/** Label of an ACME mode; the wildcard shows the parent domain it would cover. */
function certModeLabelWith(td: DnsT, mode: CertMode, host: string): string {
  if (mode === "dns") return td("certDns")
  if (mode === "dns-wildcard") {
    return td("certDnsWildcard", { base: wildcardBase(host) ?? "…" })
  }
  return td("certHttp")
}

/** ACME mode of an https domain (HTTP-01, DNS-01, DNS-01 wildcard) with a picker for developers. */
function CertModeCell({
  domain,
  canEdit,
  pending,
  onChange,
}: {
  domain: Domain
  canEdit: boolean
  pending: boolean
  onChange: (mode: CertMode) => void
}) {
  const td = useTranslations("dns.domain")
  const mode: CertMode = domain.certMode ?? "http"
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit ? (
        <Select
          value={mode}
          onValueChange={(v) => onChange(v as CertMode)}
          disabled={pending}
        >
          <SelectTrigger
            size="sm"
            className="w-44"
            aria-label={td("certModeAria", { host: domain.host })}
          >
            <SelectValue>
              {certModeLabelWith(td, mode, domain.host)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="http">{td("certHttp")}</SelectItem>
            <SelectItem value="dns">{td("certDns")}</SelectItem>
            <SelectItem
              value="dns-wildcard"
              disabled={!wildcardBase(domain.host)}
            >
              {certModeLabelWith(td, "dns-wildcard", domain.host)}
            </SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <span className="text-muted-foreground">
          {certModeLabelWith(td, mode, domain.host)}
        </span>
      )}
    </div>
  )
}

/** DNS record management of one domain: connection, proxied flag and the last sync result. */
function DnsCell({
  domain,
  connections,
  canEdit,
  pending,
  onPatch,
}: {
  domain: Domain
  connections: DnsConnection[]
  canEdit: boolean
  pending: boolean
  onPatch: (patch: {
    dnsConnectionId?: string | null
    dnsProxied?: boolean
  }) => void
}) {
  const td = useTranslations("dns.domain")
  const current = domain.dnsConnectionId ?? MANUAL
  const currentName =
    domain.dnsConnectionName ??
    connections.find((c) => c.id === domain.dnsConnectionId)?.name ??
    ""
  const label =
    current === MANUAL
      ? td("manual")
      : td("viaConnection", { name: currentName })
  const status = domain.dnsStatus
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {canEdit ? (
          <Select
            value={current}
            onValueChange={(v) =>
              onPatch({ dnsConnectionId: v === MANUAL ? null : v })
            }
            disabled={pending}
          >
            <SelectTrigger
              size="sm"
              className="w-44"
              aria-label={td("dnsConnectionAria", { host: domain.host })}
            >
              <SelectValue>{label}</SelectValue>
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value={MANUAL}>{td("manual")}</SelectItem>
              {connections.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {td("viaConnection", { name: c.name })}
                </SelectItem>
              ))}
              {domain.dnsConnectionId &&
                !connections.some((c) => c.id === domain.dnsConnectionId) && (
                  <SelectItem value={domain.dnsConnectionId} disabled>
                    {label}
                  </SelectItem>
                )}
            </SelectContent>
          </Select>
        ) : (
          <span>{label}</span>
        )}
        {domain.dnsConnectionId && status && (
          <Badge
            variant={
              status === "ok"
                ? "default"
                : status === "error"
                  ? "destructive"
                  : "secondary"
            }
          >
            {status === "ok"
              ? td("statusOk")
              : status === "warning"
                ? td("statusWarning")
                : td("statusError")}
          </Badge>
        )}
      </div>
      {domain.dnsConnectionId && (
        <label className="flex items-center gap-2 text-muted-foreground">
          <Switch
            checked={domain.dnsProxied ?? false}
            disabled={!canEdit || pending}
            onCheckedChange={(v) => onPatch({ dnsProxied: v })}
          />
          {td("proxied")}
        </label>
      )}
      {domain.dnsConnectionId && domain.dnsMessage && (
        <p
          className={`max-w-64 text-wrap ${
            status === "ok" ? "text-muted-foreground" : "text-destructive"
          }`}
        >
          {domain.dnsMessage}
        </p>
      )}
    </div>
  )
}
