"use client"

import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { updatePanelDomainAction } from "@/features/panel-domain/panel-domain.actions"
import type { PanelDomainStatus } from "@/features/panel-domain/panel-domain.entity"

/**
 * Lets the owner point the panel itself (this dashboard + its API) at a
 * custom domain, instead of hand-editing docker-compose.domain.yml/.env.dist
 * over SSH. Saving recreates the web/api containers, so the browser loses the
 * connection for a few seconds — that's expected, not an error.
 */
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

        <p className="text-xs text-muted-foreground">
          {t.rich("current", {
            web: status.applied.webOrigin ?? "http://localhost:3000",
            api: status.applied.publicApiUrl ?? "http://localhost:3001",
            code,
          })}
        </p>

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
              const r = await updatePanelDomainAction({
                webHost: webHost.trim(),
                apiHost: apiHost.trim(),
                ...(acmeEmail.trim() ? { acmeEmail: acmeEmail.trim() } : {}),
              })
              if (r.ok) {
                setApplied(true)
                setProxyAutoProvisioned(r.data.proxyAutoProvisioned)
              } else setError(r.error)
            })
          }
        >
          {pending ? t("saving") : t("saveApply")}
        </Button>

        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        {applied && (
          <Alert>
            <AlertTitle>{t("applied")}</AlertTitle>
            <AlertDescription>
              {t.rich("appliedBody", { host: webHost, code })}
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
