import { getTranslations } from "next-intl/server"
import { requireToken } from "@/features/auth/auth.session"

const API_URL = process.env.API_URL ?? "http://localhost:3001"

/** Proxies the backup file download with the httpOnly session token attached. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = await requireToken()
  const upstream = await fetch(
    `${API_URL}/backups/${encodeURIComponent(id)}/download`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  if (!upstream.ok || !upstream.body) {
    const t = await getTranslations("infra.errors")
    return new Response(t("backupNotFound"), { status: upstream.status })
  }
  const headers = new Headers()
  for (const h of ["content-type", "content-length", "content-disposition"]) {
    const v = upstream.headers.get(h)
    if (v) headers.set(h, v)
  }
  return new Response(upstream.body, { status: 200, headers })
}
