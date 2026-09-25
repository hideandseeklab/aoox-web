import { requireToken } from "@/features/auth/auth.session"

const API_URL = process.env.API_URL ?? "http://localhost:3001"

/** Proxies a table's CSV export with the session token attached. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; table: string }> }
) {
  const { id, table } = await params
  const qs = new URL(req.url).search
  const token = await requireToken()
  const upstream = await fetch(
    `${API_URL}/databases/${encodeURIComponent(id)}/tables/${encodeURIComponent(table)}/rows/export${qs}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "")
    return new Response(text || "Ekspor gagal", { status: upstream.status })
  }
  const headers = new Headers()
  for (const h of [
    "content-type",
    "content-disposition",
    "x-aoox-truncated",
  ]) {
    const v = upstream.headers.get(h)
    if (v) headers.set(h, v)
  }
  return new Response(upstream.body, { status: 200, headers })
}
