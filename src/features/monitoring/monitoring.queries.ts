import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import type {
  MetricRange,
  HostLiveMetrics,
  HostOverview,
  MetricsResponse,
  MetricsTarget,
} from "./monitoring.entity"

/** Owner/admin only (403 otherwise) — callers gate on canUseTerminal first. */
export async function getHostOverview(): Promise<HostOverview> {
  return api<HostOverview>("/monitoring/host", { token: await requireToken() })
}

/** The compose path doesn't pluralize like the other two (`/compose-apps`, not `/composes`). */
const TARGET_PATH: Record<MetricsTarget, string> = {
  application: "applications",
  database: "databases",
  compose: "compose-apps",
}

export async function getMetrics(
  target: MetricsTarget,
  id: string,
  range: MetricRange = "1h"
): Promise<MetricsResponse> {
  return api<MetricsResponse>(
    `/${TARGET_PATH[target]}/${id}/metrics${range === "1h" ? "" : `?range=${range}`}`,
    { token: await requireToken() }
  )
}

/** Owner/admin only; served from the API's in-memory host sampler. */
export async function getHostLive(): Promise<HostLiveMetrics> {
  return api<HostLiveMetrics>("/monitoring/host/live", {
    token: await requireToken(),
  })
}
