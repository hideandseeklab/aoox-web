"use client"

import { Play, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  provisionProxyAction,
  removeProxyAction,
} from "@/features/proxy/proxy.actions"
import type { ProxyStatus } from "@/features/proxy/proxy.entity"

export function ProxyCard({
  status,
  canManage,
}: {
  status: ProxyStatus
  canManage: boolean
}) {
  const t = useTranslations("infra.proxyCard")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? t("failed"))
    })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>
              {t.rich("description", {
                httpPort: status.httpPort,
                httpsPort: status.httpsPort,
                code: (c) => <code>{c}</code>,
              })}
            </CardDescription>
          </div>
          {!status.installed ? (
            <Badge variant="secondary">{t("notInstalled")}</Badge>
          ) : status.running ? (
            <Badge>{t("running")}</Badge>
          ) : (
            <Badge variant="destructive">{status.state}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <p className="text-muted-foreground">
          {t("acmeLabel")}{" "}
          {status.acmeEmail ? (
            <span className="text-foreground">
              {t.rich("acmeOn", {
                email: status.acmeEmail,
                code: (c) => <code>{c}</code>,
              })}
            </span>
          ) : (
            <span>{t.rich("acmeOff", { code: (c) => <code>{c}</code> })}</span>
          )}
        </p>
        {error && (
          <p className="text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
      {canManage && (
        <CardFooter className="gap-2">
          {!status.installed ? (
            <Button
              disabled={pending}
              onClick={() => run(provisionProxyAction)}
            >
              <Play data-icon="inline-start" />
              {pending ? t("provisioning") : t("provision")}
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() => run(() => removeProxyAction(false))}
            >
              <Trash2 data-icon="inline-start" />
              {t("remove")}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
