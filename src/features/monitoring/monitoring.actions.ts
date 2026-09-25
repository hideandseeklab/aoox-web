"use server"

import type {
  HostLiveMetrics,
  MetricRange,
  MetricsResponse,
  MetricsTarget,
} from "./monitoring.entity"
import { getHostLive, getMetrics } from "./monitoring.queries"

/** Polled by the metrics panel; a failure yields an empty response, not an error page. */
export async function fetchMetricsAction(
  target: MetricsTarget,
  id: string,
  range: MetricRange = "1h"
): Promise<MetricsResponse> {
  try {
    return await getMetrics(target, id, range)
  } catch {
    return { current: null, history: [], range }
  }
}

/** Polled every 2 s by the dashboard's live chart; null on failure keeps the last frame. */
export async function fetchHostLiveAction(): Promise<HostLiveMetrics | null> {
  try {
    return await getHostLive()
  } catch {
    return null
  }
}
