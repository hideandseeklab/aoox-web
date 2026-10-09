"use client"

import { ExternalLink, GitPullRequest, Trash2 } from "lucide-react"
import { useEffect, useState, useTransition } from "react"
import { LogViewer } from "@/components/custom/log-viewer"
import { EmptyState } from "@/components/custom/empty-state"
import { Badge } from "@/components/ui/badge"
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
}: {
  applicationId: string
  enabled: boolean
  initial: PreviewDeployment[]
  proxyHttpPort: number
}) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview pull request</CardTitle>
        <CardDescription>
          {enabled
            ? "Setiap PR yang dibuka di-build dari branch-nya dan dijalankan di container sendiri; ditutup otomatis saat PR ditutup."
            : "Nonaktif — aktifkan di tab Pengaturan. Webhook provider harus mengirim event pull request."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        {previews.length === 0 ? (
          <EmptyState icon={GitPullRequest} compact>
            Belum ada preview.
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
                      {p.status === "building" ? "building…" : p.status}
                    </Badge>
                    <span className="ms-auto" />
                    {href && p.status === "running" && (
                      <Button asChild variant="ghost" size="icon-sm">
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Buka preview #${p.prNumber}`}
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
                      Log
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Hapus preview #${p.prNumber}`}
                      disabled={pending || p.status === "building"}
                      onClick={() => remove(p.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    {p.branch}
                    {p.commitSha ? ` @ ${p.commitSha.slice(0, 7)}` : ""}
                    {p.host ? ` · ${p.host}` : " · tanpa domain preview"}
                    {p.prUrl && (
                      <>
                        {" · "}
                        <a
                          href={p.prUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          PR
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
                      label="Log preview"
                      empty="Belum ada log."
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
