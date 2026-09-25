import { redirect } from "next/navigation"
import { TerminalView } from "@/components/custom/terminal-view"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { listServers } from "@/features/server/server.queries"
import { publicApiUrl } from "@/lib/api"

export const metadata = { title: "Terminal · aoox" }

export default async function TerminalPage() {
  const session = await getVerifiedSession()
  // Members never see the sidebar link; a direct visit goes home.
  if (!session || !canUseTerminal(session.user)) redirect("/")
  const servers = await listServers()

  return (
    <div className="flex h-[calc(100svh-6rem)] flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Terminal</h1>
        <p className="text-sm text-muted-foreground">
          Shell di host aoox atau server remote (Infrastruktur → Server
          remote). Hati-hati: perintah dijalankan langsung di mesin tujuan.
        </p>
      </div>
      <TerminalView publicApiUrl={publicApiUrl()} servers={servers} />
    </div>
  )
}
