"use client"

import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import { IconButton } from "@/components/custom/data-table"

/**
 * Trash button of one backup row (database, volume or instance backups) with
 * a confirmation that names the file. The API also deletes the S3 copy when
 * the row still points at a destination (`destinationId` and `remoteKey`);
 * a row whose destination was deleted keeps its object in the bucket.
 */
export function DeleteBackupButton({
  filename,
  destinationId,
  remoteKey,
  disabled,
  onDelete,
}: {
  /** Stored path (`<slug>/<stamp>.<ext>`); only the last part is shown. */
  filename: string
  destinationId: string | null
  remoteKey: string | null
  disabled?: boolean
  onDelete: () => Promise<{ ok: boolean; error?: string }>
}) {
  const t = useTranslations("common.deleteBackup")
  const tc = useTranslations("common")
  const router = useRouter()
  const file = filename.split("/").pop() ?? filename
  const withS3 = !!destinationId && !!remoteKey

  return (
    <ConfirmDialog
      trigger={
        <IconButton label={t("aria")} disabled={disabled}>
          <Trash2 />
        </IconButton>
      }
      title={t("title")}
      description={t.rich(withS3 ? "descriptionS3" : "description", {
        file,
        code: (chunks) => <code className="break-all">{chunks}</code>,
      })}
      confirmLabel={tc("actions.delete")}
      onConfirm={async () => {
        const r = await onDelete()
        if (r.ok) router.refresh()
        return r
      }}
    />
  )
}
