"use client"

import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
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
import {
  clearPanelDomainAction,
  updatePanelDomainAction,
} from "@/features/panel-domain/panel-domain.actions"
import type { PanelDomainStatus } from "@/features/panel-domain/panel-domain.entity"

/**
 * Lets the owner point the panel itself (this dashboard + its API) at a
 * custom domain, instead of hand-editing docker-compose.domain.yml/.env.dist
 * over SSH. Saving recreates the web/api containers, so the browser loses the
 * connection for a few seconds — that's expected, not an error.
 */
const RECOVERY_COMMAND =
  "docker compose -f docker-compose.dist.yml -f docker-compose.override.yml --env-file .env.dist up -d"

export function PanelDomainCard({ status }: { status: PanelDomainStatus }) {
  const t = useTranslations("infra.panelDomain")
  const code = (c: React.ReactNode) => <code>{c}</code>
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)
  const [proxyAutoProvisioned, setProxyAutoProvisioned] = useState(false)
  const [webHost, setWebHost] = useState(status.settings.webHost ?? "")
  const [apiHost, setApiHost] = useState(status.settings.apiHost ?? "")
  const [acmeEmail, setAcmeEmail] = useState(status.settings.acmeEmail ?? "")
  const [restrictPorts, setRestrictPorts] = useState(
    status.settings.restrictPorts
  )
  const [appliedRestrict, setAppliedRestrict] = useState(false)
  // Set after "Remove domain": null = not removed, else the address to reopen (or "" if unknown).
  const [removedUrl, setRemovedUrl] = useState<string | null>(null)
  const hasDomain =
    removedUrl === null &&
    (status.settings.webHost !== null || status.settings.apiHost !== null)
  // Closing 3000/3001 needs both domains (the CLI, webhooks and sockets use the API domain).
  const bothHosts = webHost.trim() !== "" && apiHost.trim() !== ""
  const restrict = restrictPorts && bothHosts

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t.rich("description", { code })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status.installDirConfigured && (
          <Alert variant="destructive">
            <AlertTitle>{t("installDirTitle")}</AlertTitle>
            <AlertDescription>
              {t.rich("installDirBody", { code })}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pd-web">{t("webDomain")}</Label>
            <Input
              id="pd-web"
              value={webHost}
              onChange={(e) => setWebHost(e.target.value)}
              placeholder="panel.example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pd-api">{t("apiDomain")}</Label>
            <Input
              id="pd-api"
              value={apiHost}
              onChange={(e) => setApiHost(e.target.value)}
              placeholder="api.example.com"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pd-acme">{t("acmeEmail")}</Label>
            <Input
              id="pd-acme"
              type="email"
              value={acmeEmail}
              onChange={(e) => setAcmeEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div className="space-y-3 rounded-md border px-3 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <Label htmlFor="pd-restrict">{t("restrict.label")}</Label>
              <p className="text-xs text-muted-foreground">
                {t.rich("restrict.description", { code })}
              </p>
              {!bothHosts && (
                <p className="text-xs text-muted-foreground">
                  {t("restrict.needsBoth")}
                </p>
              )}
            </div>
            <Switch
              id="pd-restrict"
              className="mt-0.5 shrink-0"
              checked={restrict}
              disabled={pending || !bothHosts}
              onCheckedChange={setRestrictPorts}
            />
          </div>
          {restrict && (
            <Alert variant="destructive" className="grid-cols-[minmax(0,1fr)]">
              <AlertTitle>{t("restrict.warningTitle")}</AlertTitle>
              <AlertDescription className="min-w-0 break-words">
                {t.rich("restrict.warningBody", {
                  api: apiHost.trim() || t("proxy.domainFallback"),
                  code,
                })}
                <pre className="mt-1.5 w-full max-w-full min-w-0 overflow-x-auto rounded-md bg-muted px-2 py-1.5 font-mono text-xs text-foreground">
                  {RECOVERY_COMMAND}
                </pre>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="rounded-md border px-3 py-2 text-xs">
          <p className="font-medium">{t("current.title")}</p>
          <dl className="mt-1.5 space-y-1">
            <CurrentRow
              label={t("current.web")}
              url={status.applied.webOrigin ?? "http://localhost:3000"}
            />
            <CurrentRow
              label={t("current.api")}
              url={status.applied.publicApiUrl ?? "http://localhost:3001"}
            />
            {status.applied.portsRestricted !== null && (
              <div className="flex min-w-0 items-baseline gap-3">
                <dt className="w-20 shrink-0 text-muted-foreground">
                  {t("current.ports")}
                </dt>
                <dd>
                  {status.applied.portsRestricted
                    ? t("current.portsRestricted")
                    : t("current.portsOpen")}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {hasDomain && (
            <ConfirmDialog
              trigger={
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending || !status.installDirConfigured}
                >
                  {t("remove.button")}
                </Button>
              }
              title={t("remove.title")}
              description={t.rich("remove.description", { code })}
              confirmLabel={t("remove.confirm")}
              onConfirm={async () => {
                const r = await clearPanelDomainAction()
                if (!r.ok) return { ok: false, error: r.error }
                setRemovedUrl(r.data.reopenUrl ?? "")
                setApplied(false)
                setWebHost("")
                setApiHost("")
                setRestrictPorts(false)
              }}
            />
          )}
          <Button
            size="sm"
            disabled={
              pending || !status.installDirConfigured || !webHost || !apiHost
            }
            onClick={() =>
              start(async () => {
                setError(null)
                setApplied(false)
                setProxyAutoProvisioned(false)
                setAppliedRestrict(false)
                const r = await updatePanelDomainAction({
                  webHost: webHost.trim(),
                  apiHost: apiHost.trim(),
                  ...(acmeEmail.trim() ? { acmeEmail: acmeEmail.trim() } : {}),
                  restrictPorts: restrict,
                })
                if (r.ok) {
                  setApplied(true)
                  setProxyAutoProvisioned(r.data.proxyAutoProvisioned)
                  setAppliedRestrict(r.data.restrictPortsNote !== null)
                } else setError(r.error)
              })
            }
          >
            {pending ? t("saving") : t("saveApply")}
          </Button>
        </div>

        {error && (
          <p className="text-right text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        {removedUrl !== null && (
          <Alert>
            <AlertTitle>{t("remove.doneTitle")}</AlertTitle>
            <AlertDescription className="min-w-0 break-words">
              {removedUrl
                ? t.rich("remove.doneBody", { url: removedUrl, code })
                : t.rich("remove.doneBodyUnknown", { code })}
            </AlertDescription>
          </Alert>
        )}
        {applied && (
          <Alert>
            <AlertTitle>{t("applied")}</AlertTitle>
            <AlertDescription>
              {t.rich("appliedBody", { host: webHost, code })}
              {appliedRestrict && (
                <> {t.rich("restrict.appliedExtra", { host: webHost, code })}</>
              )}
            </AlertDescription>
          </Alert>
        )}
        {applied && proxyAutoProvisioned && (
          <Alert variant="destructive">
            <AlertTitle>{t("proxy.title")}</AlertTitle>
            <AlertDescription>
              <p>{t.rich("proxy.intro", { host: webHost, code })}</p>
              <ol className="ml-4 list-decimal space-y-1">
                <li>
                  {t.rich("proxy.dns", {
                    web: webHost,
                    api: apiHost,
                    lookup: webHost || t("proxy.domainFallback"),
                    code,
                  })}
                </li>
                <li>{t.rich("proxy.ports", { code })}</li>
                <li>{t("proxy.cert")}</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

/** One labelled URL row of the "Currently installed" block. */
function CurrentRow({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex min-w-0 items-baseline gap-3">
      <dt className="w-20 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate font-mono">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-4 hover:underline"
          title={url}
        >
          {url}
        </a>
      </dd>
    </div>
  )
}
