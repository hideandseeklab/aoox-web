"use client"

import { Eye, Pencil } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { IconButton } from "@/components/custom/data-table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

/**
 * Row action of a file mount: opens the stored file in a dialog. Editors get a Save button
 * (`onSave` resolves like a server action), viewers a read-only copy.
 */
export function MountContentDialog({
  title,
  description,
  content,
  canEdit,
  openLabel,
  saveLabel,
  pendingLabel,
  contentAria,
  onSave,
}: {
  title: string
  description: string
  content: string
  canEdit: boolean
  /** Tooltip and aria-label of the row icon. */
  openLabel: string
  saveLabel: string
  pendingLabel: string
  contentAria: string
  onSave: (content: string) => Promise<{ ok: boolean; error?: string }>
}) {
  const tc = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(content)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  return (
    <>
      <IconButton
        label={openLabel}
        onClick={() => {
          setDraft(content)
          setError(null)
          setOpen(true)
        }}
      >
        {canEdit ? <Pencil /> : <Eye />}
      </IconButton>
      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.min(20, Math.max(6, draft.split("\n").length + 1))}
            spellCheck={false}
            readOnly={!canEdit}
            className="font-mono text-xs"
            aria-label={contentAria}
          />
          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              {canEdit ? tc("actions.cancel") : tc("actions.close")}
            </Button>
            {canEdit && (
              <Button
                type="button"
                disabled={pending || draft === content}
                onClick={() =>
                  start(async () => {
                    setError(null)
                    const r = await onSave(draft)
                    if (!r.ok) return setError(r.error ?? tc("states.failed"))
                    setOpen(false)
                  })
                }
              >
                {pending ? pendingLabel : saveLabel}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
