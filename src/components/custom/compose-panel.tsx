"use client"

import { Play, Rocket, Square, Trash2 } from "lucide-react"
import { useEffect, useRef, useState, useTransition } from "react"
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
  deleteComposeAppAction,
  deployComposeAppAction,
  fetchComposeAppAction,
  fetchComposeMetricsAction,
  startComposeAppAction,
  stopComposeAppAction,
} from "@/features/compose/compose.actions"
import type {
  ComposeAppDetail,
  ComposeMetrics,
} from "@/features/compose/compose.entity"
import { formatBytes } from "@/features/monitoring/monitoring.entity"
import type { MetricsResponse } from "@/features/monitoring/monitoring.entity"
import { MetricsPanel } from "@/components/custom/metrics-panel"

const POLL_MS = 3_000
/** The sampler itself runs every 15s; this only refreshes what it has. */
const METRICS_POLL_MS = 10_000

/**
 * Status, actions, containers and the last run's log. Polls the detail
 * while an action runs (status `deploying`); actions are 202 + poll on the
 * API side, so there is no streaming socket for compose yet.
 */
export function ComposePanel({
  initial,
  metrics: initialMetrics,
}: {
  initial: ComposeAppDetail
  /** Stack-combined figures, same contract application/database pages use. */
  metrics: MetricsResponse
}) {
  const [app, setApp] = useState(initial)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const logRef = useRef<HTMLPreElement>(null)
  const busy = app.status === "deploying"

  useEffect(() => {
    if (!busy) return
    let cancelled = false
    const timer = setInterval(async () => {
      const next = await fetchComposeAppAction(app.id)
      if (!cancelled && next) setApp(next)
    }, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [busy, app.id])

  // Live CPU/RAM per service, from the background sampler (which also
  // samples stack containers). No stored history for stacks yet.
  const [metrics, setMetrics] = useState<ComposeMetrics | null>(null)
  useEffect(() => {
    let cancelled = false
    const read = async () => {
      const next = await fetchComposeMetricsAction(app.id)
      if (!cancelled) setMetrics(next)
    }
    void read()
    const timer = setInterval(() => void read(), METRICS_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [app.id, app.status])

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [app.logs])

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? "Gagal")
      else {
        const next = await fetchComposeAppAction(app.id)
        if (next) setApp(next)
      }
    })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={pending || busy}
          onClick={() => run(() => deployComposeAppAction(app.id))}
        >
          <Rocket data-icon="inline-start" />
          {app.status === "idle" ? "Deploy" : "Deploy ulang"}
        </Button>
        {app.status === "running" && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending || busy}
            onClick={() => run(() => stopComposeAppAction(app.id))}
          >
            <Square data-icon="inline-start" />
            Stop
          </Button>
        )}
        {app.status === "stopped" && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending || busy}
            onClick={() => run(() => startComposeAppAction(app.id))}
          >
            <Play data-icon="inline-start" />
            Start
          </Button>
        )}
        <span className="ms-auto" />
        <Button
          size="sm"
          variant="destructive"
          disabled={pending || busy}
          onClick={() => {
            if (!confirm("Hapus stack ini beserta volume-nya?")) return
            run(() => deleteComposeAppAction(app.id, app.projectId))
          }}
        >
          <Trash2 data-icon="inline-start" />
          Hapus
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <MetricsPanel
        target="compose"
        id={app.id}
        initial={initialMetrics}
        running={app.status === "running"}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Container</CardTitle>
            <CardDescription>
              Project compose <code>aoox-{app.slug}</code>
              {metrics && metrics.total.containers > 0 && (
                <>
                  {" · "}
                  {metrics.total.cpuPercent.toFixed(1)}% CPU ·{" "}
                  {formatBytes(metrics.total.memoryBytes)}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {app.containers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada container — deploy dulu.
              </p>
            ) : (
              <ul className="divide-y rounded-md border text-sm">
                {app.containers.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.service}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {c.name}
                      </p>
                      {(() => {
                        const m = metrics?.services.find(
                          (s) => s.containerId === c.id
                        )?.current
                        return m ? (
                          <p className="text-xs text-muted-foreground">
                            {(m.cpuPercent ?? 0).toFixed(1)}% CPU ·{" "}
                            {formatBytes(m.memoryBytes)}
                          </p>
                        ) : null
                      })()}
                    </div>
                    <Badge
                      variant={c.state === "running" ? "default" : "secondary"}
                    >
                      {c.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Log aksi terakhir</CardTitle>
            <CardDescription>
              {busy ? "Sedang berjalan…" : (app.errorMessage ?? "Selesai")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre
              ref={logRef}
              className="max-h-96 overflow-auto rounded-md bg-[#0a0a0a] p-3 font-mono text-xs whitespace-pre-wrap text-neutral-200"
            >
              {app.logs || "Belum ada log."}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
