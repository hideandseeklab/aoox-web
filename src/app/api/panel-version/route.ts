const API_URL = process.env.API_URL ?? "http://localhost:3001"

// Asked while the panel replaces itself; never cache.
export const dynamic = "force-dynamic"

/**
 * The API's running version, fetched by the web server over the internal API
 * address. The update overlay asks this same-origin route instead of calling
 * the API from the browser, so it works from any address the dashboard is
 * opened with (the API's CORS only allows `WEB_ORIGIN`), and, unlike a server
 * action, its URL does not change between web builds. Public data only
 * (the same `{description, version}` the API's `GET /` returns to anyone).
 */
export async function GET() {
  try {
    const res = await fetch(`${API_URL}/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    })
    const body: unknown = res.ok ? await res.json() : null
    const ok =
      !!body &&
      typeof body === "object" &&
      typeof (body as { description?: unknown }).description === "string"
    const version =
      ok && typeof (body as { version?: unknown }).version === "string"
        ? (body as { version: string }).version
        : null
    return Response.json(
      { reachable: ok, version },
      { headers: { "cache-control": "no-store" } }
    )
  } catch {
    return Response.json(
      { reachable: false, version: null },
      { headers: { "cache-control": "no-store" } }
    )
  }
}
