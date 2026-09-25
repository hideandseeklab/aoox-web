const API_URL = process.env.API_URL ?? "http://localhost:3001"

/** API URL as reachable from the user's browser (read at request time, so it
 *  can differ per deployment without rebuilding the image). */
export function publicApiUrl(): string {
  return process.env.PUBLIC_API_URL ?? API_URL
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
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
    try {
      const data = (await res.json()) as { message?: string | string[] }
      if (data.message) {
        message = Array.isArray(data.message)
          ? data.message.join(", ")
          : data.message
      }
    } catch {
      // non-JSON error body; keep statusText
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
