"use client"

import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { restoreBackupToNewAction } from "@/features/managed-database/managed-database.actions"
import {
  ENGINE_LABEL,
  type DatabaseBackup,
  type ManagedDatabaseDetail,
} from "@/features/managed-database/managed-database.entity"
import { useRouter } from "@/lib/use-router"

/**
 * "Restore to new database": asks for a name and a target project, then the API
 * creates the database and restores the backup into it in the background.
 * The source database is never touched. Closing is locked while the request runs.
 */
export function RestoreToNewDialog({
  db,
  backup,
  projects,
  onClose,
}: {
  db: ManagedDatabaseDetail
  /** The backup being restored; null = closed. */
  backup: DatabaseBackup | null
  projects: { id: string; name: string }[]
  onClose: () => void
}) {
  // The form lives inside the content, which Radix unmounts on close: its
  // fields start fresh every time the dialog opens.
  const [locked, setLocked] = useState(false)
  return (
    <Dialog
      open={backup !== null}
      onOpenChange={(o) => {
        if (!o && !locked) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={!locked}>
        {backup && (
          <RestoreToNewForm
            db={db}
            backup={backup}
            projects={projects}
            onClose={onClose}
            onPendingChange={setLocked}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function RestoreToNewForm({
  db,
  backup,
  projects,
  onClose,
  onPendingChange,
}: {
  db: ManagedDatabaseDetail
  backup: DatabaseBackup
  projects: { id: string; name: string }[]
  onClose: () => void
  onPendingChange: (pending: boolean) => void
}) {
  const t = useTranslations("database")
  const tc = useTranslations("common")
  const router = useRouter()
  const [pending, start] = useTransition()
  const [name, setName] = useState(
    `${db.name} ${t("backups.restoreNew.nameSuffix")}`
  )
  const [projectId, setProjectId] = useState(db.projectId)
  const [error, setError] = useState<string | null>(null)

  // Always offer the source's own project, even if the list could not be loaded.
  const options = projects.some((p) => p.id === db.projectId)
    ? projects
    : [
        { id: db.projectId, name: t("backups.restoreNew.thisProject") },
        ...projects,
      ]

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError(t("validation.nameRequired"))
      return
    }
    setError(null)
    onPendingChange(true)
    start(async () => {
      const r = await restoreBackupToNewAction(backup.id, {
        name: trimmed,
        projectId,
      })
      onPendingChange(false)
      if (!r.ok) {
        setError(r.error)
        return
      }
      toast.success(t("backups.restoreNew.started", { name: trimmed }))
      onClose()
      router.push(`/databases/${r.data.id}`)
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("backups.restoreNew.title")}</DialogTitle>
        <DialogDescription>
          {t.rich("backups.restoreNew.description", {
            engine: ENGINE_LABEL[db.engine],
            name: db.name,
            file: backup.filename.split("/").pop() ?? "",
            b: (chunks) => (
              <span className="font-medium text-foreground">{chunks}</span>
            ),
            code: (chunks) => <code>{chunks}</code>,
          })}
        </DialogDescription>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="rtn-name">{t("backups.restoreNew.nameLabel")}</Label>
          <Input
            id="rtn-name"
            value={name}
            maxLength={100}
            disabled={pending}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rtn-project">
            {t("backups.restoreNew.projectLabel")}
          </Label>
          <Select
            value={projectId}
            onValueChange={setProjectId}
            disabled={pending}
          >
            <SelectTrigger id="rtn-project" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {options.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onClose}
          >
            {tc("actions.cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && (
              <Loader2
                data-icon="inline-start"
                className="motion-safe:animate-spin"
              />
            )}
            {t("backups.restoreNew.submit")}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
