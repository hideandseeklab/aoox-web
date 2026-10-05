"use client"

import { Cpu, MemoryStick, Network } from "lucide-react"
import { useEffect, useState } from "react"
import { StatCard } from "@/components/custom/stat-card"
import { fetchProjectResourceUsageAction } from "@/features/project/project.actions"
import type { ProjectResourceUsageResponse } from "@/features/project/project.entity"
import { formatBytes } from "@/features/monitoring/monitoring.entity"

/** Matches the API sampler (SAMPLE_INTERVAL_MS); polling faster gains nothing. */
const POLL_MS = 15_000

/**
 * CPU/RAM/network for the whole project (every application, database and
 * compose stack container summed), live only — the API endpoint has no
 * stored history, unlike the per-resource MetricsPanel, so there is no
 * range picker here.
 */
export function ProjectResourcePanel({
  projectId,
  initial,
}: {
  projectId: string
  initial: ProjectResourceUsageResponse
}) {
  const [data, setData] = useState(initial)

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      const next = await fetchProjectResourceUsageAction(projectId)
      if (!cancelled) setData(next)
    }
    const timer = setInterval(() => void tick(), POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [projectId])

  const cur = data.current
  if (!cur) {
    return (
      <p className="text-xs text-muted-foreground">
        Tidak ada aplikasi/database/stack yang berjalan di project ini.
      </p>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard
        variant="tile"
        icon={Cpu}
        label="CPU"
        value={cur.cpuPercent === null ? "–" : `${cur.cpuPercent.toFixed(1)}%`}
        hint={`jumlah ${data.containers} container`}
        trend={{
          series: data.history.map((p) => p.cpuPercent ?? 0),
          format: (v) => `${v.toFixed(1)}%`,
          history: data.history,
        }}
      />
      <StatCard
        variant="tile"
        icon={MemoryStick}
        label="Memori"
        value={formatBytes(cur.memoryBytes)}
        trend={{
          series: data.history.map((p) => p.memoryBytes),
          format: formatBytes,
          history: data.history,
        }}
      />
      <StatCard
        variant="tile"
        icon={Network}
        label="Jaringan"
        value={
          cur.netRxBytesPerSec === null
            ? "–"
            : `↓ ${formatBytes(cur.netRxBytesPerSec)}/s`
        }
        hint={
          cur.netTxBytesPerSec === null
            ? undefined
            : `↑ ${formatBytes(cur.netTxBytesPerSec)}/s`
        }
        trend={{
          series: data.history.map((p) => p.netRxBytesPerSec ?? 0),
          format: (v) => `${formatBytes(v)}/s`,
          history: data.history,
        }}
      />
    </div>
  )
}
