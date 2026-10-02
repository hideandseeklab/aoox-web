/** Mirrors MonitorView in aoox-api (http-monitor module). */
export type HttpMonitorState = "unknown" | "up" | "down"

export interface HttpMonitorConfig {
  enabled: boolean
  path: string
  intervalMinutes: number
  timeoutSeconds: number
  /** Healthy status codes, e.g. `200-399` or `200,204`. */
  expectedCodes: string
  failureThreshold: number
  /** Probe through the internal address instead of the public domain. */
  useInternal: boolean
}

export type HttpMonitorTargetSource = "domain" | "hostPort" | "container"

export interface HttpMonitorView {
  config: HttpMonitorConfig
  /** What the next check requests; null when the app has no reachable address. */
  target: { url: string; source: HttpMonitorTargetSource } | null
  targetError: string | null
  status: {
    state: HttpMonitorState
    since: string | null
    lastCheckedAt: string | null
    lastStatusCode: number | null
    lastLatencyMs: number | null
    lastError: string | null
    consecutiveFailures: number
  }
  stats: {
    uptime24h: number | null
    uptime7d: number | null
    checks24h: number
    avgLatencyMs24h: number | null
    p95LatencyMs24h: number | null
  }
  /** Last 24 h in up to 120 buckets. */
  series: Array<{
    at: string
    latencyMs: number | null
    checks: number
    failures: number
  }>
  incidents: Array<{
    id: string
    startedAt: string
    endedAt: string | null
    durationSeconds: number
    reason: string | null
    failedChecks: number
  }>
}

export const INTERVAL_OPTIONS = [1, 2, 5, 10, 15, 30, 60] as const
export const TIMEOUT_OPTIONS = [5, 10, 15, 30] as const
export const THRESHOLD_OPTIONS = [1, 2, 3, 5, 10] as const
