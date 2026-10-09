"use client"

import { Layers } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { EmptyState } from "@/components/custom/empty-state"
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
import { Switch } from "@/components/ui/switch"
import { setDomainMiddlewaresAction } from "@/features/application/application.actions"
import type {
  Domain,
  DomainMiddlewareOption,
} from "@/features/application/application.entity"

/**
 * Picks the Traefik middlewares (from the operator's dynamic config files) that run in front of
 * one domain. The order they are switched on is the order they run, so it is listed explicitly.
 * Saving recreates the app's container with new labels (no rebuild), like changing a domain.
 */
export function DomainMiddlewaresDialog({
  applicationId,
  domain,
  options,
}: {
  applicationId: string
  domain: Domain
  options: DomainMiddlewareOption[]
}) {
  const t = useTranslations("applications")
  const tc = useTranslations("common")
  const current = domain.middlewares ?? []
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>(current)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  // A middleware still on the domain whose file was disabled/removed is kept visible so it can
  // be taken off; the API refuses to save a list that names one that no longer exists.
  const known = new Set(options.map((o) => o.ref))
  const orphans = selected.filter((r) => !known.has(r))

  const toggle = (ref: string, on: boolean) =>
    setSelected((s) => (on ? [...s, ref] : s.filter((r) => r !== ref)))

  const save = () =>
    start(async () => {
      setError(null)
      const r = await setDomainMiddlewaresAction(
        applicationId,
        domain.id,
        selected
      )
      if (!r.ok) return setError(r.error)
      setOpen(false)
    })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        setOpen(next)
        if (next) {
          setSelected(current)
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Layers data-icon="inline-start" />
          {t("middlewares.manage")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("middlewares.title", { host: domain.host })}</DialogTitle>
          <DialogDescription>{t("middlewares.description")}</DialogDescription>
        </DialogHeader>
        {options.length === 0 && orphans.length === 0 ? (
          <EmptyState icon={Layers} compact>
            {t("middlewares.empty")}
          </EmptyState>
        ) : (
          <ul className="divide-y rounded-md border text-xs">
            {options.map((o) => {
              const index = selected.indexOf(o.ref)
              return (
                <li key={o.ref} className="flex items-center gap-3 px-3 py-2">
                  <Switch
                    checked={index >= 0}
                    onCheckedChange={(v) => toggle(o.ref, v)}
                    aria-label={o.ref}
                    disabled={pending}
                  />
                  <span className="min-w-0 truncate font-mono">{o.ref}</span>
                  <span className="ms-auto text-muted-foreground">
                    {index >= 0 ? t("middlewares.order", { n: index + 1 }) : o.file}
                  </span>
                </li>
              )
            })}
            {orphans.map((ref) => (
              <li key={ref} className="flex items-center gap-3 px-3 py-2">
                <Switch
                  checked
                  onCheckedChange={() => toggle(ref, false)}
                  aria-label={ref}
                  disabled={pending}
                />
                <span className="min-w-0 truncate font-mono">{ref}</span>
                <span className="ms-auto text-destructive">{t("middlewares.gone")}</span>
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            {tc("actions.cancel")}
          </Button>
          <Button type="button" onClick={save} disabled={pending}>
            {pending ? tc("states.saving") : tc("actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
