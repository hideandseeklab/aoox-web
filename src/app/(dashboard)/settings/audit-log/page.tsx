import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AuditLogTable } from "@/components/custom/audit-log-table"
import { Button } from "@/components/ui/button"
import { listAuditLogs } from "@/features/audit-log/audit-log.queries"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"

export const metadata = { title: "Audit log · aoox" }

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; before?: string }>
}) {
  const session = await getVerifiedSession()
  // Owner/admin only (the API enforces it too; members get a 404 rather than a 403 page).
  if (!session || !canUseTerminal(session.user)) notFound()
  const { action, before } = await searchParams
  const rows = await listAuditLogs({ action, before, limit: 100 })

  return (
    <>
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon" className="mt-0.5">
          <Link href="/settings?tab=team" aria-label="Kembali ke Settings">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Audit log</h1>
          <p className="text-sm text-muted-foreground">
            Semua permintaan yang mengubah sesuatu (dan percobaan masuk), siapa
            pelakunya dan lewat apa. Disimpan 90 hari.
          </p>
        </div>
      </div>
      <AuditLogTable rows={rows} action={action ?? ""} />
    </>
  )
}
