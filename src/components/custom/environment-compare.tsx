"use client"

import { ArrowRight, GitCompareArrows, Lock } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"
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
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  diffEnvironmentsAction,
  promoteEnvironmentAction,
} from "@/features/variable-set/variable-set.actions"
import type {
  EnvironmentDiff,
  EnvironmentView,
} from "@/features/variable-set/variable-set.entity"
import { useRouter } from "@/lib/use-router"

/**
 * Compares two environments of one variable set key by key (names only, never values) and lets
 * someone who may read the source and change the target promote selected
 * variables from one into the other, behind a confirm step that names the keys
 * and the target.
 */
export function EnvironmentCompare({
  setId,
  environments,
}: {
  setId: string
  environments: EnvironmentView[]
}) {
  const t = useTranslations("variables.editor.compare")
  const router = useRouter()
  const tc = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(
    () =>
      environments.find((e) => e.name === "staging")?.name ??
      environments[0]?.name ??
      ""
  )
  const [to, setTo] = useState(
    () =>
      environments.find((e) => e.name === "production")?.name ??
      environments[1]?.name ??
      ""
  )
  const [diff, setDiff] = useState<EnvironmentDiff | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [confirming, setConfirming] = useState(false)
  const [pending, start] = useTransition()

  const sameEnv = from === to
  // Latest request wins: a slow answer for an earlier pair is dropped.
  const requestId = useRef(0)
  const load = (f: string, t2: string) => {
    const id = ++requestId.current
    setError(null)
    setDiff(null)
    setSelected([])
    if (!f || !t2 || f === t2) {
      setLoading(false)
      return
    }
    setLoading(true)
    diffEnvironmentsAction(setId, f, t2).then((r) => {
      if (id !== requestId.current) return
      setLoading(false)
      if (r.ok) setDiff(r.data)
      else setError(r.error)
    })
  }

  const target = environments.find((e) => e.name === to)
  const source = environments.find((e) => e.name === from)
  // Only keys that exist in the source and differ (or are missing) can move.
  const promotable = diff?.comparable
    ? [...diff.onlyInFrom, ...(diff.different ?? [])]
    : []
  const toggle = (key: string) =>
    setSelected((s) =>
      s.includes(key) ? s.filter((k) => k !== key) : [...s, key]
    )

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        setConfirming(false)
        setError(null)
        if (o) load(from, to)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <GitCompareArrows data-icon="inline-start" />
          {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        {confirming && target && source ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {t("confirmTitle", { name: target.name })}
              </DialogTitle>
              <DialogDescription>
                {t("confirmBody", { from: source.name, to: target.name })}
              </DialogDescription>
            </DialogHeader>
            <ul className="flex flex-wrap gap-1.5 rounded-md border p-2 text-xs">
              {selected.map((k) => (
                <li
                  key={k}
                  className="rounded bg-muted px-1.5 py-0.5 font-mono"
                >
                  {k}
                </li>
              ))}
            </ul>
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
                  setConfirming(false)
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
                    const r = await promoteEnvironmentAction(
                      setId,
                      target.id,
                      source.id,
                      selected,
                      target.updatedAt
                    )
                    if (r.ok) {
                      toast.success(
                        t("promoted", {
                          count: selected.length,
                          name: target.name,
                        })
                      )
                      setConfirming(false)
                      setOpen(false)
                      router.refresh()
                    } else setError(r.error)
                  })
                }
              >
                {pending ? t("promoting") : t("confirm")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>{t("description")}</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
              <EnvSelect
                id="compare-from"
                label={t("from")}
                value={from}
                onChange={(v) => {
                  setFrom(v)
                  load(v, to)
                }}
                environments={environments}
                placeholder={t("choose")}
              />
              <ArrowRight
                className="hidden size-4 self-center text-muted-foreground sm:mt-6 sm:block"
                aria-hidden
              />
              <EnvSelect
                id="compare-to"
                label={t("to")}
                value={to}
                onChange={(v) => {
                  setTo(v)
                  load(from, v)
                }}
                environments={environments}
                placeholder={t("choose")}
              />
            </div>

            <div className="max-h-[50vh] space-y-4 overflow-y-auto text-xs">
              {sameEnv ? (
                <p className="text-muted-foreground">{t("sameEnv")}</p>
              ) : loading ? (
                <p className="py-4 text-center text-muted-foreground">
                  {t("loading")}
                </p>
              ) : error ? (
                <p className="text-destructive" role="alert">
                  {error}
                </p>
              ) : diff ? (
                <DiffView diff={diff} selected={selected} onToggle={toggle} />
              ) : null}
            </div>

            {diff?.comparable && promotable.length > 0 && !sameEnv && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{t("selected", { count: selected.length })}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelected(promotable)}
                  >
                    {t("selectAll")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={selected.length === 0}
                    onClick={() => setSelected([])}
                  >
                    {t("clear")}
                  </Button>
                </div>
                <Button
                  disabled={selected.length === 0}
                  onClick={() => setConfirming(true)}
                >
                  {t("promote", { name: diff.to.name })}
                </Button>
              </div>
            )}
            {diff?.comparable && promotable.length === 0 && !sameEnv && (
              <p className="text-xs text-muted-foreground">{t("nothing")}</p>
            )}
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

function EnvSelect({
  id,
  label,
  value,
  onChange,
  environments,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (name: string) => void
  environments: EnvironmentView[]
  placeholder: string
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent position="popper">
          {environments.map((e) => (
            <SelectItem key={e.id} value={e.name}>
              {e.protected && <Lock className="size-3" aria-hidden />}
              {e.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

function DiffView({
  diff,
  selected,
  onToggle,
}: {
  diff: EnvironmentDiff
  selected: string[]
  onToggle: (key: string) => void
}) {
  const t = useTranslations("variables.editor.compare")
  const identical =
    diff.comparable &&
    diff.onlyInFrom.length === 0 &&
    diff.onlyInTo.length === 0 &&
    (diff.different?.length ?? 0) === 0
  return (
    <>
      {!diff.comparable && (
        <p className="rounded-md border border-dashed px-3 py-2 text-muted-foreground">
          {t("notComparable")}
        </p>
      )}
      <KeyGroup
        title={t("onlyInFrom", { name: diff.from.name })}
        keys={diff.onlyInFrom}
        selectable={diff.comparable}
        selected={selected}
        onToggle={onToggle}
      />
      {diff.different && (
        <KeyGroup
          title={t("different")}
          keys={diff.different}
          selectable={diff.comparable}
          selected={selected}
          onToggle={onToggle}
        />
      )}
      <KeyGroup
        title={t("onlyInTo", { name: diff.to.name })}
        keys={diff.onlyInTo}
        selectable={false}
        selected={selected}
        onToggle={onToggle}
      />
      {diff.same && (
        <p className="text-muted-foreground">
          {t("sameCount", { count: diff.same.length })}
        </p>
      )}
      {identical && <p className="text-muted-foreground">{t("identical")}</p>}
    </>
  )
}

function KeyGroup({
  title,
  keys,
  selectable,
  selected,
  onToggle,
}: {
  title: string
  keys: string[]
  selectable: boolean
  selected: string[]
  onToggle: (key: string) => void
}) {
  if (keys.length === 0) return null
  return (
    <section className="space-y-1.5">
      <h4 className="font-medium">
        {title}{" "}
        <span className="text-muted-foreground tabular-nums">
          ({keys.length})
        </span>
      </h4>
      <ul className="divide-y rounded-md border">
        {keys.map((k) => (
          <li key={k} className="px-3 py-1.5">
            {selectable ? (
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="size-3.5 shrink-0 accent-primary"
                  checked={selected.includes(k)}
                  onChange={() => onToggle(k)}
                />
                <code className="min-w-0 truncate font-mono">{k}</code>
              </label>
            ) : (
              <code className="block truncate font-mono">{k}</code>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
