"use client"

import { Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition, type ReactNode } from "react"
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
import { cn } from "@/lib/utils"

/** What `onSubmit` resolves to; `{ ok: false }` keeps the dialog open and shows `error` inside it. */
export type AddResult = { ok: boolean; error?: string } | void

/**
 * The "+ Add" button of a list tab together with the dialog it opens (put it in the
 * `SectionHeader` action slot). The dialog owns the pending state and the error line: while the
 * action runs it cannot be closed, a failure stays inside the dialog, a success closes it.
 * `onOpenChange` fires on open and on close so the caller can reset its form fields.
 */
export function AddDialog({
  title,
  description,
  triggerLabel,
  submitLabel,
  pendingLabel,
  submitDisabled,
  onSubmit,
  onOpenChange,
  children,
  className,
}: {
  title: string
  description: ReactNode
  /** Text of the "+ Add" button; defaults to "Add". */
  triggerLabel?: string
  submitLabel?: string
  pendingLabel?: string
  submitDisabled?: boolean
  onSubmit: () => Promise<AddResult>
  onOpenChange?: (open: boolean) => void
  /** The form fields. */
  children: ReactNode
  className?: string
}) {
  const tc = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const change = (next: boolean) => {
    if (pending) return
    setOpen(next)
    setError(null)
    onOpenChange?.(next)
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogTrigger asChild>
        <Button>
          <Plus data-icon="inline-start" />
          {triggerLabel ?? tc("actions.add")}
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg",
          className
        )}
      >
        <form
          className="grid min-w-0 gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              setError(null)
              const r = await onSubmit()
              if (r && !r.ok) return setError(r.error ?? tc("states.failed"))
              setOpen(false)
              onOpenChange?.(false)
            })
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="grid min-w-0 gap-3">{children}</div>
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
              onClick={() => change(false)}
            >
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" disabled={pending || submitDisabled}>
              {pending
                ? (pendingLabel ?? tc("states.saving"))
                : (submitLabel ?? tc("actions.add"))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
