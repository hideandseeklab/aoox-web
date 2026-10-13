"use client"

import { Eye, EyeOff, History, RotateCcw } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
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
import {
  listEnvironmentVersionsAction,
  restoreEnvironmentVersionAction,
  revealEnvironmentVersionAction,
} from "@/features/variable-set/variable-set.actions"
import type {
  EnvironmentVersion,
  EnvironmentView,
} from "@/features/variable-set/variable-set.entity"
import { useRouter } from "@/lib/use-router"
import { formatDateTime } from "@/i18n/format"

/** The API keeps this many versions per environment (ENV_VERSION_KEEP). */
const KEEP = 50

/**
 * Version history of one environment: who changed which variable names and
 * when. Values are only shown on request (an audited reveal of one version).
 * Restoring an old version writes it as a new one (behind a confirm step), so
 * it needs the same right as editing.
 */
export function EnvironmentHistory({
  setId,
  environment: env,
  canReveal,
  restoreNote,
}: {
  setId: string
  environment: EnvironmentView
  /** Same rule as editing: not a viewer, and an instance owner/admin for a protected environment. */
  canReveal: boolean
  /** Why revealing and restoring are unavailable (shown when `canReveal` is false). */
  restoreNote: string
}) {
  const t = useTranslations("variables.editor.history")
  const tc = useTranslations("common")
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [versions, setVersions] = useState<EnvironmentVersion[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<EnvironmentVersion | null>(null)
  // Revealed text per version id (only while the dialog is open).
  const [revealed, setRevealed] = useState<Record<string, string>>({})
  const [revealing, setRevealing] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()
  const canRestore = canReveal

  const reveal = (v: EnvironmentVersion) => {
    if (revealed[v.id] !== undefined) {
      setRevealed((cur) => {
        const next = { ...cur }
        delete next[v.id]
        return next
      })
      return
    }
    setRevealing(v.id)
    setError(null)
    revealEnvironmentVersionAction(setId, env.id, v.id).then((r) => {
      setRevealing(null)
      if (r.ok) setRevealed((cur) => ({ ...cur, [v.id]: r.data.variables }))
      else setError(r.error)
    })
  }

  const load = () =>
    start(async () => {
      setError(null)
      const r = await listEnvironmentVersionsAction(setId, env.id)
      if (r.ok) setVersions(r.data)
      else setError(r.error)
    })

  const when = (v: EnvironmentVersion) => formatDateTime(v.createdAt, locale)

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        setConfirming(null)
        setError(null)
        setRevealed({})
        if (o) load()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <History data-icon="inline-start" />
          {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        {confirming ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("restoreTitle")}</DialogTitle>
              <DialogDescription>
                {t("restoreBody", { name: env.name, when: when(confirming) })}
              </DialogDescription>
            </DialogHeader>
            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setConfirming(null)
                  setError(null)
                }}
              >
                {t("back")}
              </Button>
              <Button
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    setError(null)
                    const r = await restoreEnvironmentVersionAction(
                      setId,
                      env.id,
                      confirming.id,
                      env.updatedAt
                    )
                    if (r.ok) {
                      toast.success(t("restored", { name: env.name }))
                      setConfirming(null)
                      router.refresh()
                      const l = await listEnvironmentVersionsAction(
                        setId,
                        env.id
                      )
                      if (l.ok) setVersions(l.data)
                    } else setError(r.error)
                  })
                }
              >
                <RotateCcw data-icon="inline-start" />
                {pending ? t("restoring") : t("restoreNow")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("title", { name: env.name })}</DialogTitle>
              <DialogDescription>{t("description")}</DialogDescription>
            </DialogHeader>

            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
            {versions === null && !error ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {t("loading")}
              </p>
            ) : versions && versions.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                {t("empty")}
              </p>
            ) : (
              <ul className="max-h-[55vh] divide-y overflow-y-auto rounded-md border text-xs">
                {versions?.map((v) => (
                  <li key={v.id} className="space-y-1.5 px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium">{actionLabel(t, v)}</span>
                        {v.current && (
                          <Badge variant="secondary">{t("current")}</Badge>
                        )}
                        {v.via === "token" && (
                          <Badge variant="outline">{t("viaToken")}</Badge>
                        )}
                      </div>
                      {canReveal && (
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={revealing === v.id}
                            aria-expanded={revealed[v.id] !== undefined}
                            onClick={() => reveal(v)}
                          >
                            {revealed[v.id] !== undefined ? (
                              <EyeOff data-icon="inline-start" />
                            ) : (
                              <Eye data-icon="inline-start" />
                            )}
                            {revealed[v.id] !== undefined
                              ? t("hideValues")
                              : revealing === v.id
                                ? t("revealingValues")
                                : t("revealValues")}
                          </Button>
                          {canRestore && !v.current && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setError(null)
                                setConfirming(v)
                              }}
                            >
                              <RotateCcw data-icon="inline-start" />
                              {t("restore")}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      {v.via === "system"
                        ? t("system")
                        : (v.authorEmail ?? "—")}{" "}
                      · {when(v)}
                    </p>
                    <Summary v={v} />
                    {revealed[v.id] !== undefined && (
                      <pre className="max-h-48 overflow-auto rounded-md border bg-muted/40 p-2 font-mono text-xs break-all whitespace-pre-wrap">
                        {revealed[v.id] || t("emptyText")}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">
              {t("keepNote", { count: KEEP })}
              {!canRestore && versions && versions.length > 0
                ? ` ${restoreNote}`
                : ""}
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {tc("actions.close")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function actionLabel(
  t: ReturnType<typeof useTranslations>,
  v: EnvironmentVersion
): string {
  if (v.action === "promote") {
    return t("action.promote", { name: v.detail?.replace(/^From /, "") ?? "" })
  }
  return t(`action.${v.action}`)
}

/** `+ Added: A, B` lines; key names only, wrapped as they come. */
function Summary({ v }: { v: EnvironmentVersion }) {
  const t = useTranslations("variables.editor.history")
  const s = v.summary
  const rows: Array<[string, string, string[]]> = [
    ["+", t("added"), s.added],
    ["~", t("changed"), s.changed],
    ["−", t("removed"), s.removed],
    ["•", t("flags"), s.flags],
  ]
  // The baseline lists every variable as "added": hide it, it is not a change.
  if (v.action === "baseline") return null
  const shown = rows.filter(([, , names]) => names.length > 0)
  if (shown.length === 0) {
    return <p className="text-muted-foreground">{t("onlyComments")}</p>
  }
  return (
    <div className="space-y-0.5">
      {shown.map(([sign, label, names]) => (
        <p key={label} className="flex gap-1.5">
          <span className="w-3 shrink-0 text-center font-mono" aria-hidden>
            {sign}
          </span>
          <span className="min-w-0">
            <span className="text-muted-foreground">{label}: </span>
            <span className="font-mono break-words">{names.join(", ")}</span>
          </span>
        </p>
      ))}
    </div>
  )
}
