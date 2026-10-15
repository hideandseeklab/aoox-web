"use client"

import { Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { deleteDatabaseAction } from "@/features/managed-database/managed-database.actions"

/** Danger zone action of the database page: delete, keeping or purging the data volume. */
export function DeleteDatabaseButton({
  id,
  projectId,
  name,
}: {
  id: string
  projectId: string
  name: string
}) {
  const t = useTranslations("database")
  const tc = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 data-icon="inline-start" />
          {t("panel.delete.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("panel.delete.title", { name })}</DialogTitle>
          <DialogDescription>{t("panel.delete.description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {tc("actions.cancel")}
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(() => deleteDatabaseAction(id, projectId, false))
            }
          >
            {t("panel.delete.keepData")}
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(() => deleteDatabaseAction(id, projectId, true))
            }
          >
            {t("panel.delete.withData")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
