"use client"

import { useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { useComposeLive } from "@/components/custom/compose-live"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { fetchComposeMetricsAction } from "@/features/compose/compose.actions"
import type { ComposeMetrics } from "@/features/compose/compose.entity"
import { formatBytes } from "@/features/monitoring/monitoring.entity"
import type { MetricsResponse } from "@/features/monitoring/monitoring.entity"
import { MetricsPanel } from "@/components/custom/metrics-panel"

/** The sampler itself runs every 15s; this only refreshes what it has. */
const METRICS_POLL_MS = 10_000

/**
 * Metrics, containers and the last run's log. The stack's live state (and the status/actions in the
 * strip under the tabs) come from `ComposeLiveProvider`, which polls the detail while an action runs.
 */
export function ComposePanel({
  metrics: initialMetrics,
}: {
  /** Stack-combined figures, same contract application/database pages use. */
  metrics: MetricsResponse
}) {
  const { app, busy } = useComposeLive()
  const logRef = useRef<HTMLPreElement>(null)

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

  return (
    <div className="space-y-4">
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
              <p className="text-xs text-muted-foreground">
                Belum ada container — deploy dulu.
              </p>
            ) : (
              <ul className="divide-y rounded-md border text-xs">
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
