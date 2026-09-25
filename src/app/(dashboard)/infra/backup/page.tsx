import { notFound } from "next/navigation"
import { InstanceBackupCard } from "@/components/custom/instance-backup-card"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { listBackupDestinations } from "@/features/backup-destination/backup-destination.queries"
import {
  getInstanceBackupSettings,
  listInstanceBackups,
} from "@/features/instance-backup/instance-backup.queries"
import { InfraPage } from "../infra-page"

export const metadata = { title: "Backup instance · aoox" }

export default async function InstanceBackupPage() {
  const session = await getVerifiedSession()
  // Owner only: a snapshot of the panel database.
  if (!session || session.user.role !== "owner") notFound()
  const [backups, settings, destinations] = await Promise.all([
    listInstanceBackups(),
    getInstanceBackupSettings(),
    listBackupDestinations(),
  ])
  return (
    <InfraPage
      title="Backup instance"
      description="Snapshot database panel ini untuk pindah server atau pemulihan."
    >
      <InstanceBackupCard
        backups={backups}
        settings={settings}
        destinations={destinations}
      />
    </InfraPage>
  )
}
