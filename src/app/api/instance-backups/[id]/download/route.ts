import { requireToken } from "@/features/auth/auth.session"

const API_URL = process.env.API_URL ?? "http://localhost:3001"

/** Proxies the instance snapshot download with the httpOnly session token attached. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = await requireToken()
  const upstream = await fetch(
    `${API_URL}/instance/backups/${encodeURIComponent(id)}/download`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!upstream.ok || !upstream.body) {
    return new Response("Backup tidak ditemukan", { status: upstream.status })
  }
  const headers = new Headers()
  for (const h of ["content-type", "content-length", "content-disposition"]) {
    const v = upstream.headers.get(h)
    if (v) headers.set(h, v)
  }
  return new Response(upstream.body, { status: 200, headers })
}
