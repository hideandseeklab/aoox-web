import { publicApiUrl, webOrigin } from "@/lib/api"

// Read from the environment on every request (it can differ per deployment
// without rebuilding the image), so never prerender this at build time.
export const dynamic = "force-dynamic"

/**
 * Public discovery document for the CLI (`aoox login`): the user only ever
 * types the dashboard address, and the CLI learns the API address from here.
 * Contains nothing secret — the same URLs the browser already uses.
 */
export function GET() {
  return Response.json(
    {
      apiUrl: publicApiUrl().replace(/\/+$/, ""),
      webUrl: webOrigin().replace(/\/+$/, ""),
      version: process.env.NEXT_PUBLIC_WEB_VERSION ?? null,
    },
    { headers: { "cache-control": "no-store" } }
  )
}
