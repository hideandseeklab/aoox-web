import { headers as requestHeaders } from "next/headers"

const API_URL = process.env.API_URL ?? "http://localhost:3001"

/** API URL as reachable from the user's browser (read at request time, so it
 *  can differ per deployment without rebuilding the image). */
export function publicApiUrl(): string {
  return process.env.PUBLIC_API_URL ?? API_URL
}

/**
 * The one origin the API's WebSocket gateways (Terminal, realtime logs)
 * accept — set by the panel-domain feature when a custom domain is saved.
 * A page opened from any other origin (e.g. the host's bare IP, once a
 * domain is configured) has its socket connections rejected with
 * "origin not allowed".
 */
export function webOrigin(): string {
  return process.env.WEB_ORIGIN ?? "http://localhost:3000"
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Full parsed JSON error body, for callers that need more than `message`
     *  (e.g. the `usage` array on a 409 from delete-repository). */
    public readonly details?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown
  token?: string
}

/**
 * `X-Forwarded-For` to pass on to the API: the chain the reverse proxy in front of the
 * web server (Traefik with the panel domain) put on the incoming request. Without it the
 * API only sees this container's address for every sign-in, so its per-IP rate limit and
 * audit log would treat all users as one. Empty outside a request (build, cron) and when
 * the web is opened directly on its port (no proxy header, nothing to forward).
 */
async function clientForwardedFor(): Promise<Record<string, string>> {
  try {
    const value = (await requestHeaders()).get("x-forwarded-for")?.trim()
    return value ? { "X-Forwarded-For": value } : {}
  } catch {
    return {}
  }
}

/** Server-side fetch wrapper for aoox-api. Throws `ApiError` on non-2xx. */
export async function api<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { body, token, headers, ...rest } = options

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(await clientForwardedFor()),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  })

  if (!res.ok) {
    let message = res.statusText
    let details: unknown
    try {
      const data = (await res.json()) as { message?: string | string[] }
      details = data
      if (data.message) {
        message = Array.isArray(data.message)
          ? data.message.join(", ")
          : data.message
      }
    } catch {
      // non-JSON error body; keep statusText
    }
    throw new ApiError(res.status, message, details)
  }

  // Some 2xx answers carry no body: 204/205 by definition, and the API's `202 Accepted` handlers
  // that return `void` (instance env, instance update). Parsing "" as JSON would throw a
  // SyntaxError that callers report as "cannot reach the server" even though the call worked.
  // A non-empty body that is not valid JSON still throws.
  if (res.status === 204 || res.status === 205) return undefined as T
  const text = await res.text()
  if (text === "") return undefined as T
  return JSON.parse(text) as T
}
