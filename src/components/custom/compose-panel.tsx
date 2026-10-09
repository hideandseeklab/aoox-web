"use client"

import { useEffect, useState } from "react"
import { Container } from "lucide-react"
import { LogViewer } from "@/components/custom/log-viewer"
import { EmptyState } from "@/components/custom/empty-state"
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
            <CardDescription className="tabular-nums">
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
              <EmptyState icon={Container} compact>
                Belum ada container — deploy dulu.
              </EmptyState>
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
                          <p className="text-xs text-muted-foreground tabular-nums">
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
            <LogViewer
              text={app.logs ?? ""}
              label="Log aksi terakhir"
              empty="Belum ada log."
              className="h-96"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
