/** Mirrors ResourceAlertsView in aoox-api (resource-alert module). */
export type AlertMetric = "cpu" | "memory"
export type AlertStatus = "ok" | "pending" | "alerting"
export type AlertOwnerKind = "application" | "database"

export interface AlertRuleConfig {
  enabled: boolean
  thresholdPercent: number
  durationMinutes: number
}

export interface AlertRule extends AlertRuleConfig {
  state: {
    status: AlertStatus
    since: string | null
    /** Percent at the last evaluation. */
    lastValue: number | null
    lastEvaluatedAt: string | null
    lastAlertAt: string | null
  }
}

export interface ResourceAlertsView {
  cpu: AlertRule
  memory: AlertRule
  /** The limits the percentages refer to (null = none set). */
  limits: { cpuMillicores: number | null; memoryMb: number | null }
}

export const CPU_THRESHOLD_OPTIONS = [50, 70, 80, 90, 95, 100, 150, 200, 300, 400] as const
export const MEMORY_THRESHOLD_OPTIONS = [50, 60, 70, 80, 85, 90, 95] as const
export const DURATION_OPTIONS = [1, 2, 5, 10, 15, 30, 60] as const
