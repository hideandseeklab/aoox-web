import { PathArrow } from "@/components/custom/arrows"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { TerminalView } from "@/components/custom/terminal-view"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { listServers } from "@/features/server/server.queries"
import { getTerminalStatus } from "@/features/terminal/terminal.queries"
import { publicApiUrl, webOrigin } from "@/lib/api"

export const metadata = { title: "Terminal · aoox" }

export default async function TerminalPage() {
  const session = await getVerifiedSession()
  // Members never see the sidebar link; a direct visit goes home.
  if (!session || !canUseTerminal(session.user)) redirect("/")
  const t = await getTranslations("terminal.page")
  const tNav = await getTranslations("nav")
  const servers = await listServers()
  const isOwner = session.user.role === "owner"
  // Only the owner sees the auto-authorize button; a failed status read just hides it.
  const terminalStatus = isOwner
    ? await getTerminalStatus().catch(() => null)
    : null
  const autoAuthorizeUser =
    terminalStatus?.canAutoAuthorize && terminalStatus.username
      ? terminalStatus.username
      : null

  return (
    <div className="flex h-[calc(100svh-6rem)] flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Terminal</h1>
        <p className="text-xs text-muted-foreground">
          {t.rich("description", {
            path: () => (
              <>
                {tNav("groups.infrastructure")}
                <PathArrow />
                {tNav("remoteServers")}
              </>
            ),
          })}
        </p>
      </div>
      <TerminalView
        publicApiUrl={publicApiUrl()}
        webOrigin={webOrigin()}
        servers={servers}
        isOwner={isOwner}
        autoAuthorizeUser={autoAuthorizeUser}
      />
    </div>
  )
}
