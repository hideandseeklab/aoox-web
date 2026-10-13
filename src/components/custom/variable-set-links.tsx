"use client"

import {
  ArrowDown,
  ArrowUp,
  Info,
  Link2,
  Loader2,
  Lock,
  Plus,
  X,
} from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  replaceLinksAction,
  type LinkOwner,
} from "@/features/variable-set/variable-set.actions"
import {
  envKeys,
  linkConflicts,
  MAX_LINKS,
  type LinkView,
  type ProjectVariableSet,
} from "@/features/variable-set/variable-set.entity"

/** One entry of the draft list (what a row needs, saved or not). */
interface DraftLink {
  environmentId: string
  environmentName: string
  protected: boolean
  setId: string
  setName: string
  keys: string[]
}

function fromLinkView(l: LinkView): DraftLink {
  return {
    environmentId: l.environmentId,
    environmentName: l.environmentName,
    protected: l.protected,
    setId: l.setId,
    setName: l.setName,
    keys: l.keys,
  }
}

/**
 * The ordered list of set environments an application or stack links, with
 * conflict hints: a key also defined by a later link loses to it, and a key of
 * the own env always wins. `mode="saved"` saves with its own button (PUT); in
 * `mode="form"` (create forms) it only writes the ids to a hidden field.
 */
export function VariableSetLinksEditor({
  mode,
  owner,
  initial = [],
  available,
  ownEnv = "",
  canEdit = true,
  canLinkProtected = true,
  name = "variableSetLinks",
  namespace,
}: {
  mode: "saved" | "form"
  /** Required in saved mode. */
  owner?: LinkOwner
  initial?: LinkView[]
  /** Sets shared with the owner's project (`GET /projects/:id/variable-sets`). */
  available: ProjectVariableSet[]
  /** The owner's own env text (its keys win over every link). */
  ownEnv?: string
  canEdit?: boolean
  /** Project admins only may add or remove a link to a protected environment. */
  canLinkProtected?: boolean
  /** Hidden field name in form mode. */
  name?: string
  /** Wording for "application" or "stack". */
  namespace: "application" | "compose"
}) {
  const t = useTranslations("variables.links")
  const tc = useTranslations("common")
  const [saved, setSaved] = useState<LinkView[]>(initial)
  const [draft, setDraft] = useState<DraftLink[]>(() =>
    initial.map(fromLinkView)
  )
  const [adding, setAdding] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const savedIds = saved.map((l) => l.environmentId)
  const draftIds = draft.map((l) => l.environmentId)
  const dirty =
    savedIds.length !== draftIds.length ||
    savedIds.some((id, i) => id !== draftIds[i])
  // Same rule as the API's linkConflicts, computed locally so it follows unsaved
  // reordering and the own env as it is now (the API's copy is from the last save).
  const hints = linkConflicts(draft, envKeys(ownEnv))

  const options = available.flatMap((s) =>
    s.environments.map((e) => ({ set: s, env: e }))
  )
  const full = draft.length >= MAX_LINKS
  const editable = canEdit && (mode === "form" || !!owner)

  const add = () => {
    const opt = options.find((o) => o.env.id === adding)
    if (!opt || draftIds.includes(opt.env.id) || full) return
    setDraft((cur) => [
      ...cur,
      {
        environmentId: opt.env.id,
        environmentName: opt.env.name,
        protected: opt.env.protected,
        setId: opt.set.id,
        setName: opt.set.name,
        keys: opt.env.keys,
      },
    ])
    setAdding("")
    setError(null)
  }

  const move = (index: number, delta: -1 | 1) =>
    setDraft((cur) => {
      const next = [...cur]
      const [item] = next.splice(index, 1)
      next.splice(index + delta, 0, item)
      return next
    })

  // A saved link to a protected environment can only be removed by a project admin.
  const canRemove = (l: DraftLink) =>
    canLinkProtected || !l.protected || !savedIds.includes(l.environmentId)

  const save = () =>
    start(async () => {
      if (!owner) return
      setError(null)
      const r = await replaceLinksAction(owner, draftIds)
      if (r.ok) {
        setSaved(r.data)
        setDraft(r.data.map(fromLinkView))
        toast.success(t("saved"))
      } else setError(r.error)
    })

  const list = (
    <div className="space-y-3">
      {draft.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
          {t(namespace === "application" ? "emptyApp" : "emptyStack")}
        </p>
      ) : (
        <ol className="divide-y rounded-md border text-xs">
          {draft.map((l, i) => {
            const h = hints[i] ?? { shadowedKeys: [], overriddenByOwnEnv: [] }
            const lost = new Set([...h.shadowedKeys, ...h.overriddenByOwnEnv])
            return (
              <li key={l.environmentId} className="space-y-1.5 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground tabular-nums"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 flex-wrap items-center gap-x-1.5">
                      <Link
                        href={`/variables/${l.setId}`}
                        className="truncate font-medium underline-offset-4 hover:underline"
                      >
                        {l.setName}
                      </Link>
                      <span className="text-muted-foreground" aria-hidden>
                        /
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono">
                        {l.protected && (
                          <Lock
                            className="size-3 text-muted-foreground"
                            aria-label={t("protected")}
                          />
                        )}
                        {l.environmentName}
                      </span>
                    </p>
                  </div>
                  {editable && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("moveUp", { name: l.environmentName })}
                        title={t("moveUp", { name: l.environmentName })}
                        disabled={i === 0 || pending}
                        onClick={() => move(i, -1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("moveDown", { name: l.environmentName })}
                        title={t("moveDown", { name: l.environmentName })}
                        disabled={i === draft.length - 1 || pending}
                        onClick={() => move(i, 1)}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("remove", { name: l.environmentName })}
                        title={
                          canRemove(l)
                            ? t("remove", { name: l.environmentName })
                            : t("protectedNeedsAdmin")
                        }
                        disabled={!canRemove(l) || pending}
                        onClick={() =>
                          setDraft((cur) =>
                            cur.filter(
                              (x) => x.environmentId !== l.environmentId
                            )
                          )
                        }
                      >
                        <X />
                      </Button>
                    </div>
                  )}
                </div>
                {l.keys.length === 0 ? (
                  <p className="ps-7 text-muted-foreground">{t("noKeys")}</p>
                ) : (
                  <ul className="flex flex-wrap gap-1 ps-7">
                    {l.keys.map((k) => (
                      <li key={k}>
                        <code
                          className={cn(
                            "rounded bg-muted px-1.5 py-0.5 font-mono",
                            lost.has(k) &&
                              "text-muted-foreground line-through decoration-muted-foreground/60"
                          )}
                          title={
                            h.shadowedKeys.includes(k)
                              ? t("shadowedTitle")
                              : h.overriddenByOwnEnv.includes(k)
                                ? t("ownEnvTitle")
                                : undefined
                          }
                        >
                          {k}
                        </code>
                      </li>
                    ))}
                  </ul>
                )}
                {h.shadowedKeys.length > 0 && (
                  <p className="ps-7 text-amber-700 dark:text-amber-400">
                    {t("shadowed", { keys: h.shadowedKeys.join(", ") })}
                  </p>
                )}
                {h.overriddenByOwnEnv.length > 0 && (
                  <p className="ps-7 text-amber-700 dark:text-amber-400">
                    {t(
                      namespace === "application"
                        ? "overriddenApp"
                        : "overriddenStack",
                      { keys: h.overriddenByOwnEnv.join(", ") }
                    )}
                  </p>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {editable &&
        (available.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t.rich("noneShared", {
              link: (chunks) => (
                <Link
                  href="/variables"
                  className="text-foreground underline underline-offset-4"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <Select value={adding} onValueChange={setAdding} disabled={full}>
              <SelectTrigger
                className="min-w-0 flex-1 sm:w-72 sm:flex-none"
                aria-label={t("addLabel")}
              >
                <SelectValue placeholder={t("addPlaceholder")} />
              </SelectTrigger>
              <SelectContent position="popper">
                {available.map((s) => (
                  <SelectGroup key={s.id}>
                    <SelectLabel>{s.name}</SelectLabel>
                    {s.environments.map((e) => (
                      <SelectItem
                        key={e.id}
                        value={e.id}
                        disabled={
                          draftIds.includes(e.id) ||
                          (e.protected && !canLinkProtected)
                        }
                      >
                        {e.protected && <Lock className="size-3" aria-hidden />}
                        <span className="font-mono">{e.name}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {t("keyCount", { count: e.keys.length })}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              disabled={!adding || full}
              onClick={add}
            >
              <Plus data-icon="inline-start" />
              {t("add")}
            </Button>
          </div>
        ))}

      <div className="space-y-1 text-xs text-muted-foreground">
        <p className="flex gap-1.5">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            {t.rich(namespace === "application" ? "orderApp" : "orderStack", {
              code: (chunks) => <code className="font-mono">{chunks}</code>,
              ref: "${{vars.KEY}}",
            })}
          </span>
        </p>
        {full && <p className="ps-5">{t("max", { count: MAX_LINKS })}</p>}
        {editable && !canLinkProtected && (
          <p className="ps-5">{t("protectedNeedsAdmin")}</p>
        )}
      </div>

      {mode === "form" && (
        <input type="hidden" name={name} value={draftIds.join(",")} />
      )}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )

  if (mode === "form") return list

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Link2 className="size-4 text-muted-foreground" aria-hidden />
          {t("title")}
        </CardTitle>
        <CardDescription className="max-w-3xl">
          {t("description")}
        </CardDescription>
        {editable && (
          <CardAction className="flex items-center gap-2">
            {dirty && (
              <Badge variant="outline" className="hidden sm:inline-flex">
                {t("unsaved")}
              </Badge>
            )}
            <Button type="button" disabled={!dirty || pending} onClick={save}>
              {pending && (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              )}
              {tc("actions.save")}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {list}
        {!canEdit && (
          <p className="mt-3 text-xs text-muted-foreground">{t("readOnly")}</p>
        )}
      </CardContent>
    </Card>
  )
}
