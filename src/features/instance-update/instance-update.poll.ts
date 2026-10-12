/**
 * Version-independent probes used while the panel replaces itself.
 *
 * Server actions are bound to the running web build: once the web container is
 * the new version, an old page's action ids no longer exist and every call
 * fails, indistinguishable from "still restarting". These probes are plain
 * browser `fetch` calls to two same-origin routes whose URLs never change
 * between builds: the web's `/.well-known/aoox.json` and `/api/panel-version`
 * (the web server asks the API's `GET /` over the internal address, so the
 * probe works from any address the dashboard is opened with — the API's CORS
 * only allows `WEB_ORIGIN`).
 */

export interface Probe {
  reachable: boolean
  /** Running version as the service reports it; null when unreachable or not reported. */
  version: string | null
}

export interface PanelProbe {
  web: Probe
  api: Probe
  /** API base URL from the discovery document, when the web answered. */
  apiUrl: string | null
}

export type UpdatePhase = "downloading" | "restarting" | "back"

const DOWN: Probe = { reachable: false, version: null }
const PROBE_TIMEOUT_MS = 4000

async function getJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      // Same-origin only; `/api/panel-version` sits behind the session redirect.
      credentials: "same-origin",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const body: unknown = await res.json()
    return body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : null
  } catch {
    // Network error, timeout, a 502 page from the proxy, invalid JSON: the
    // service is not answering properly, which is expected mid-restart.
    return null
  }
}

const versionOf = (body: Record<string, unknown>) =>
  typeof body.version === "string" ? body.version : null

export async function probePanel(apiUrl: string | null): Promise<PanelProbe> {
  const webBody = await getJson("/.well-known/aoox.json")
  const web: Probe = webBody
    ? { reachable: true, version: versionOf(webBody) }
    : DOWN
  const discovered = typeof webBody?.apiUrl === "string" ? webBody.apiUrl : null
  const base = (discovered ?? apiUrl)?.replace(/\/+$/, "") ?? null
  // Through the web server, not the browser: no CORS, whatever the page origin.
  const apiBody = await getJson("/api/panel-version")
  const api: Probe =
    apiBody?.reachable === true
      ? { reachable: true, version: versionOf(apiBody) }
      : DOWN
  return { web, api, apiUrl: base }
}

/**
 * Whether a probe shows the new build. With a known target that differs from
 * the starting version, the version must match it. Otherwise (target unknown,
 * or an image republished under the same version) the version cannot tell, so
 * a service only counts as new after it was seen unreachable at least once.
 */
export function isUpdated(
  probe: Probe,
  from: string | null,
  target: string | null,
  sawDown: boolean
): boolean {
  if (!probe.reachable) return false
  if (target && target !== from) return probe.version === target
  if (probe.version !== null && from !== null && probe.version !== from) {
    return true
  }
  return sawDown
}

export function phaseOf(
  webNew: boolean,
  apiNew: boolean,
  down: boolean
): UpdatePhase {
  if (webNew && apiNew) return "back"
  if (down || webNew || apiNew) return "restarting"
  return "downloading"
}

export const UPDATED_FLAG_KEY = "aoox.updated"

export function rememberUpdated(version: string): void {
  try {
    sessionStorage.setItem(UPDATED_FLAG_KEY, version)
  } catch {
    // Storage blocked: the success toast is only a nicety.
  }
}

/** Reads and clears the flag set just before the post-update reload. */
export function takeUpdatedFlag(): string | null {
  try {
    const v = sessionStorage.getItem(UPDATED_FLAG_KEY)
    if (v !== null) sessionStorage.removeItem(UPDATED_FLAG_KEY)
    return v
  } catch {
    return null
  }
}
