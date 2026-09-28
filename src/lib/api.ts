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

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
