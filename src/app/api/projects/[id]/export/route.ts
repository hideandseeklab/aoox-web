import { requireToken } from "@/features/auth/auth.session"

const API_URL = process.env.API_URL ?? "http://localhost:3001"

/** Proxies the project export as a JSON download (`?includeSecrets=true` passes through). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = await requireToken()
  const includeSecrets =
    new URL(req.url).searchParams.get("includeSecrets") === "true"
  const upstream = await fetch(
    `${API_URL}/projects/${encodeURIComponent(id)}/export${includeSecrets ? "?includeSecrets=true" : ""}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  )
  if (!upstream.ok) {
    return new Response(await upstream.text(), { status: upstream.status })
  }
  const body = (await upstream.json()) as { project?: { name?: string } }
  const slug =
    (body.project?.name ?? "project")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${slug}.aoox.json"`,
      "cache-control": "no-store",
    },
  })
}
