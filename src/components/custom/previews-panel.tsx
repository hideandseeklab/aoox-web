"use client"

import { ExternalLink, GitPullRequest, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState, useTransition } from "react"
import { LogViewer } from "@/components/custom/log-viewer"
import { EmptyState } from "@/components/custom/empty-state"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  deletePreviewAction,
  fetchPreviewsAction,
} from "@/features/application/application.actions"
import { Switch } from "@/components/ui/switch"
import { setPreviewWildcardAction } from "@/features/dns/dns.actions"
import type { PreviewDeployment } from "@/features/application/preview.entity"

const POLL_MS = 5_000

/**
 * Open pull-request previews: one container each, created/rebuilt/removed
 * by the provider webhook. Polls while any preview is building.
 */
export function PreviewsPanel({
  applicationId,
  enabled,
  initial,
  proxyHttpPort,
  previewDomain,
  wildcardCert,
  proxyDnsEnabled,
  canEdit,
}: {
  applicationId: string
  enabled: boolean
  initial: PreviewDeployment[]
  proxyHttpPort: number
  /** Base domain of the previews; null = the API default (PREVIEW_DOMAIN). */
  previewDomain: string | null
  wildcardCert: boolean
  /** The proxy serving this app has DNS-01. */
  proxyDnsEnabled: boolean
  canEdit: boolean
}) {
  const t = useTranslations("applications")
  const td = useTranslations("dns.previews")
  const [wildcard, setWildcard] = useState(wildcardCert)
  const [previews, setPreviews] = useState(initial)
  const [open, setOpen] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const building = previews.some((p) => p.status === "building")

  useEffect(() => {
    if (!building) return
    let cancelled = false
    const timer = setInterval(async () => {
      const next = await fetchPreviewsAction(applicationId)
      if (!cancelled) setPreviews(next)
    }, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [building, applicationId])

  const remove = (id: string) =>
    start(async () => {
      setError(null)
      const r = await deletePreviewAction(id, applicationId)
      if (!r.ok) setError(r.error)
      else setPreviews(await fetchPreviewsAction(applicationId))
    })

  const toggleWildcard = (next: boolean) =>
    start(async () => {
      setError(null)
      const r = await setPreviewWildcardAction(applicationId, next)
      if (!r.ok) return void toast.error(r.error)
      setWildcard(next)
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("previews.title")}</CardTitle>
        <CardDescription>
          {enabled
            ? t("previews.descriptionEnabled")
            : t("previews.descriptionDisabled")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        {(proxyDnsEnabled || wildcard) && (
          <div className="space-y-1 rounded-md border px-3 py-2">
            <label className="flex items-center gap-2">
              <Switch
                checked={wildcard}
                disabled={!canEdit || pending || (!previewDomain && !wildcard)}
                onCheckedChange={toggleWildcard}
              />
              {td("wildcardLabel")}
            </label>
            <p className="text-muted-foreground">
              {previewDomain
                ? td("wildcardHelp", { domain: previewDomain })
                : td("wildcardNeedsDomain")}
            </p>
          </div>
        )}
        {previews.length === 0 ? (
          <EmptyState icon={GitPullRequest} compact>
            {t("previews.empty")}
          </EmptyState>
        ) : (
          <ul className="divide-y rounded-md border">
            {previews.map((p) => {
              const href = p.host
                ? `http://${p.host}${proxyHttpPort === 80 ? "" : `:${proxyHttpPort}`}`
                : null
              return (
                <li key={p.id} className="space-y-1 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <GitPullRequest className="size-4 text-muted-foreground" />
                    <span className="font-medium">#{p.prNumber}</span>
                    <span className="truncate">{p.title}</span>
                    <Badge
                      variant={
                        p.status === "running"
                          ? "default"
                          : p.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {p.status === "building"
                        ? t("previews.building")
                        : p.status}
                    </Badge>
                    <span className="ms-auto" />
                    {href && p.status === "running" && (
                      <Button asChild variant="ghost" size="icon-sm">
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={t("previews.openAria", { n: p.prNumber })}
                        >
                          <ExternalLink />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpen(open === p.id ? null : p.id)}
                    >
                      {t("previews.log")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("previews.deleteAria", { n: p.prNumber })}
                      disabled={pending || p.status === "building"}
                      onClick={() => remove(p.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    {p.branch}
                    {p.commitSha ? ` @ ${p.commitSha.slice(0, 7)}` : ""}
                    {p.host ? ` · ${p.host}` : ` · ${t("previews.noDomain")}`}
                    {p.prUrl && (
                      <>
                        {" · "}
                        <a
                          href={p.prUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          {t("previews.pr")}
                        </a>
                      </>
                    )}
                  </p>
                  {p.errorMessage && (
                    <p className="text-xs text-destructive">{p.errorMessage}</p>
                  )}
                  {open === p.id && (
                    <LogViewer
                      text={p.logs ?? ""}
                      label={t("previews.logLabel")}
                      empty={t("previews.noLogs")}
                      className="max-h-64"
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {error && (
          <p className="text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
