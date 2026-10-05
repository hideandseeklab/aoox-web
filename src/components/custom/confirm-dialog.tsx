"use client"

import { Loader2 } from "lucide-react"
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

/** What an action resolves to; `{ ok: false }` keeps the dialog open and shows `error`. */
export type ConfirmResult = { ok: boolean; error?: string } | void

interface ConfirmChoice {
  label: string
  onConfirm: () => Promise<ConfirmResult>
}

/**
 * One confirmation dialog for every delete / destructive / risky action in the panel.
 *
 * - `trigger` is the button that opens it; pass `open`/`onOpenChange` instead (or too)
 *   to drive it from code, e.g. after picking a file.
 * - `tone="destructive"` (default) makes the confirm button red; `"neutral"` is for risky
 *   but not destructive actions (running an uploaded SQL file).
 * - `alternative` adds a second, non-destructive choice next to the main one (e.g. "detach the
 *   mount only" beside "detach and delete the volume").
 * - While an action runs the dialog cannot be closed; if it resolves to `{ ok: false }` the
 *   error shows inside the dialog and it stays open. Exceptions are not caught, so a server
 *   action that redirects still works.
 */
export function ConfirmDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  title,
  description,
  confirmLabel,
  tone = "destructive",
  onConfirm,
  alternative,
}: {
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  tone?: "destructive" | "neutral"
  onConfirm: () => Promise<ConfirmResult>
  alternative?: ConfirmChoice
}) {
  const [innerOpen, setInnerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [running, setRunning] = useState<"main" | "alternative" | null>(null)
  const open = controlledOpen ?? innerOpen

  const setOpen = (next: boolean) => {
    if (pending) return
    if (!next) setError(null)
    if (controlledOpen === undefined) setInnerOpen(next)
    onOpenChange?.(next)
  }

  const run = (
    which: "main" | "alternative",
    fn: () => Promise<ConfirmResult>
  ) =>
    start(async () => {
      setError(null)
      setRunning(which)
      const r = await fn()
      setRunning(null)
      if (r && !r.ok) return setError(r.error ?? "Gagal")
      if (controlledOpen === undefined) setInnerOpen(false)
      onOpenChange?.(false)
    })

  const spinner = (which: "main" | "alternative") =>
    pending &&
    running === which && (
      <Loader2 className="animate-spin" data-icon="inline-start" />
    )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Batal
          </Button>
          {alternative && (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => run("alternative", alternative.onConfirm)}
            >
              {spinner("alternative")}
              {alternative.label}
            </Button>
          )}
          <Button
            variant={tone === "destructive" ? "destructive" : "default"}
            disabled={pending}
            onClick={() => run("main", onConfirm)}
          >
            {spinner("main")}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
