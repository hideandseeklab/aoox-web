/** Mirrors ContainerMetrics / HostOverview in aoox-api (monitoring module). */
export interface ContainerMetrics {
  at: string
  /** Percent of one CPU (can exceed 100 on multi-core); null when not computable. */
  cpuPercent: number | null
  memoryBytes: number
  /** The host's RAM when the container has no memory limit. */
  memoryLimitBytes: number
  netRxBytes: number
  netTxBytes: number
}

export interface MetricsResponse {
  current: ContainerMetrics | null
  history: ContainerMetrics[]
  /** Swarm service: number of local tasks summed into the figures (absent/1 otherwise). */
  tasks?: number
  /** Range the history covers; `1h` is live, longer ones are stored rollups. */
  range?: MetricRange
}

/** Ranges the API accepts on `?range=`; `1h` is the live in-memory series. */
export const METRIC_RANGES = ["1h", "24h", "7d", "30d"] as const
export type MetricRange = (typeof METRIC_RANGES)[number]

export const METRIC_RANGE_LABEL: Record<MetricRange, string> = {
  "1h": "1 jam",
  "24h": "24 jam",
  "7d": "7 hari",
  "30d": "30 hari",
}

export interface HostOverview {
  cpus: number
  memoryTotalBytes: number
  serverVersion: string
  operatingSystem: string
  containers: { total: number; running: number }
  images: number
  disk: {
    imagesBytes: number
    containersBytes: number
    volumesBytes: number
    buildCacheBytes: number
  }
  managed: { containers: number; memoryBytes: number; cpuPercent: number }
}

export type MetricsTarget = "application" | "database" | "compose"

/** 1.5 KB · 12.3 MB · 1.2 GB — compact, for stat tiles. */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "–"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`
}

/** Mirrors HostSample / HostLiveMetrics in the API (2 s sampler, 5 min history). */
export interface HostSample {
  at: string
  /** 0–100 over all cores; null for the first sample. */
  cpuPercent: number | null
  memoryUsedBytes: number
  memoryTotalBytes: number
  load1: number
  diskUsedBytes: number
  diskTotalBytes: number
}

export interface HostLiveMetrics {
  current: HostSample | null
  history: HostSample[]
  managed: { cpuPercent: number; memoryBytes: number; containers: number }
  cpus: number
}
