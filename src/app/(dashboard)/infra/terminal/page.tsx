import { notFound } from "next/navigation"
import { TerminalCard } from "@/components/custom/terminal-card"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { getTerminalStatus } from "@/features/terminal/terminal.queries"
import { InfraPage } from "../infra-page"

export const metadata = { title: "Terminal · aoox" }

export default async function TerminalSettingsPage() {
  const session = await getVerifiedSession()
  // Owner/admin only (the API enforces it too; members get a 404 rather than a 403 page).
  if (!session || !canUseTerminal(session.user)) notFound()
  const status = await getTerminalStatus()
  return (
    <InfraPage
      title="Terminal"
      description="Ke mana web shell terhubung (lokal atau SSH ke host) dan key platform yang dipakainya."
    >
      <TerminalCard status={status} />
    </InfraPage>
  )
}
