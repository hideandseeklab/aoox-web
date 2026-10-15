"use client"

import { Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { deleteProjectAction } from "@/features/project/project.actions"

export function DeleteProjectButton({
  id,
  name,
}: {
  id: string
  name: string
}) {
  const t = useTranslations("projects")
  const tc = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [purge, setPurge] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = () =>
    startTransition(async () => {
      setError(null)
      const result = await deleteProjectAction(id, purge)
      if (result?.error) setError(result.error)
    })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setPurge(false)
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 data-icon="inline-start" />
          {tc("actions.delete")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("delete.title")}</DialogTitle>
          <DialogDescription>
            {t.rich("delete.description", {
              name,
              b: (chunks) => (
                <span className="font-medium text-foreground">{chunks}</span>
              ),
            })}
          </DialogDescription>
        </DialogHeader>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-md border p-3 text-xs">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-primary"
            checked={purge}
            disabled={pending}
            onChange={(e) => setPurge(e.target.checked)}
          />
          <span className="flex min-w-0 flex-col gap-1">
            <span className="font-medium">{t("delete.purgeLabel")}</span>
            <span className="text-muted-foreground">
              {t("delete.purgeHint")}
            </span>
          </span>
        </label>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            {tc("actions.cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={submit}
          >
            {pending ? tc("states.deleting") : tc("actions.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
