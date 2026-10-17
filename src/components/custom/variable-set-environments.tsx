"use client"

import {
  Boxes,
  Copy,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Layers,
  Link2,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RotateCw,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { DangerZoneItem } from "@/components/custom/danger-zone"
import { IconButton } from "@/components/custom/data-table"
import { EnvEditor } from "@/components/custom/env-editor"
import { EnvironmentCompare } from "@/components/custom/environment-compare"
import { EnvironmentHistory } from "@/components/custom/environment-history"
import { PageTabsTrigger } from "@/components/custom/page-tabs-trigger"
import { ScrollableTabsList } from "@/components/custom/scrollable-tabs-list"
import { VariableNotePopover } from "@/components/custom/variable-note-popover"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { copyToClipboard, copyToClipboardLater } from "@/lib/clipboard"
import { useRouter } from "@/lib/use-router"
import { cn } from "@/lib/utils"
import { toRows } from "@/features/variable-set/env-rows"
import {
  createEnvironmentAction,
  deleteEnvironmentAction,
  revealEnvironmentAction,
  updateEnvironmentAction,
} from "@/features/variable-set/variable-set.actions"
import {
  canRevealEnvironment,
  ENVIRONMENT_NAME,
  MAX_ENVIRONMENTS,
  type EnvironmentView,
  type VariableSetDetail,
} from "@/features/variable-set/variable-set.entity"

/**
 * The environments of one variable set (development, staging, production,
 * ...): one tab each, with the variable names and masked values. Values only
 * leave the API through the audited reveal action; protected environments are
 * for instance owners/admins, viewers see names only.
 */
export function VariableSetEnvironments({ set }: { set: VariableSetDetail }) {
  const t = useTranslations("variables.editor")
  const environments = set.environments
  const [selected, setSelected] = useState(() => environments[0]?.id ?? "")
  const current = environments.some((e) => e.id === selected)
    ? selected
    : (environments[0]?.id ?? "")
  const canAdd = set.canManage && environments.length < MAX_ENVIRONMENTS

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription className="col-span-2 col-start-1 row-start-2 sm:col-span-1">
          {t("description")}
        </CardDescription>
        {(canAdd || environments.length > 1) && (
          // Under the description on a phone, on the right from sm up.
          <CardAction className="col-start-1 row-span-1 row-start-3 mt-2 flex flex-wrap gap-2 justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:justify-self-end">
            {environments.length > 1 && (
              <EnvironmentCompare setId={set.id} environments={environments} />
            )}
            {canAdd && (
              <AddEnvironment
                setId={set.id}
                onCreated={(id) => setSelected(id)}
              />
            )}
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {environments.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
            {t("noEnvironments")}
          </p>
        ) : (
          <Tabs value={current} onValueChange={setSelected}>
            <ScrollableTabsList>
              {environments.map((e) => (
                <PageTabsTrigger
                  key={e.id}
                  value={e.id}
                  icon={e.protected ? Lock : KeyRound}
                >
                  {e.name}
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {e.keys.length}
                  </span>
                  {e.usedBy.length > 0 && (
                    <span
                      className="inline-flex items-center gap-0.5 text-xs text-muted-foreground tabular-nums"
                      title={t("linkedCount", { count: e.usedBy.length })}
                    >
                      <Link2 className="size-3" aria-hidden />
                      <span aria-hidden>{e.usedBy.length}</span>
                      <span className="sr-only">
                        {t("linkedCount", { count: e.usedBy.length })}
                      </span>
                    </span>
                  )}
                </PageTabsTrigger>
              ))}
            </ScrollableTabsList>
            {environments.map((e) => (
              <TabsContent key={e.id} value={e.id} className="space-y-4 pt-4">
                <EnvironmentPanel
                  set={set}
                  environment={e}
                  others={environments.filter((o) => o.id !== e.id)}
                  onDeleted={() => setSelected("")}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}

/** Shown values hide again (and are dropped from memory) this long after the last show. */
const REVEAL_TTL_MS = 60_000

/** One audited reveal, kept in page memory until it expires. */
interface Revealed {
  variables: string
  /** Value per name; a repeated name keeps its last definition (as the API merges). */
  values: Map<string, string>
  secretKeys: string[]
  plainKeys: string[]
  updatedAt?: string
  expiresAt: number
}

function valuesOf(text: string): Map<string, string> {
  const values = new Map<string, string>()
  for (const row of toRows(text)) {
    if (row.kind === "var" && row.key.trim())
      values.set(row.key.trim(), row.value)
  }
  return values
}

function EnvironmentPanel({
  set,
  environment: env,
  others,
  onDeleted,
}: {
  set: VariableSetDetail
  environment: EnvironmentView
  /** The set's other environments, for the "Used by" hint. */
  others: EnvironmentView[]
  onDeleted: () => void
}) {
  const t = useTranslations("variables.editor")
  const tc = useTranslations("common")
  const router = useRouter()
  const [pending, start] = useTransition()
  const [editing, setEditing] = useState<string | null>(null)
  // Secret flags as revealed with the values; the editor reports the changes.
  const [revealedFlags, setRevealedFlags] = useState<{
    secretKeys: string[]
    plainKeys: string[]
  }>({ secretKeys: [], plainKeys: [] })
  // Version of the text being edited; the save is refused if it changed since.
  const [version, setVersion] = useState<string | undefined>()
  // Remounts the editor when a newer text is loaded after a conflict.
  const [editorKey, setEditorKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  // The last reveal (all values of this environment), reused by the row
  // buttons, Reveal all and Edit until it expires, so one click does not
  // mean one audited reveal per row. The panel unmounts on a tab switch or
  // when leaving the page, which drops it too.
  const [revealed, setRevealed] = useState<Revealed | null>(null)
  const revealedRef = useRef<Revealed | null>(null)
  const inflight = useRef<Promise<Revealed | null> | null>(null)
  // Names whose value is shown in the list; Reveal all fills it.
  const [shown, setShown] = useState<ReadonlySet<string>>(() => new Set())
  const [allShown, setAllShown] = useState(false)
  // What is waiting for the reveal: a variable name, "all" or "edit".
  const [busy, setBusy] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const isViewer = set.role === "viewer"
  const canReveal = canRevealEnvironment(set.role, env)
  const isSecret = (k: string) => env.secretKeys.includes(k)

  const storeRevealed = (next: Revealed | null) => {
    revealedRef.current = next
    setRevealed(next)
  }

  const forget = () => {
    storeRevealed(null)
    setShown(new Set())
    setAllShown(false)
  }

  // Auto-hide: once the reveal expires, hide every value and drop them. Not
  // while the editor is open (it keeps its own copy of the text).
  useEffect(() => {
    if (!revealed || editing !== null) return
    const id = window.setInterval(() => {
      const at = Date.now()
      setNow(at)
      if (at >= revealed.expiresAt) {
        revealedRef.current = null
        setRevealed(null)
        setShown(new Set())
        setAllShown(false)
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [revealed, editing])

  /** The cached reveal, or one audited reveal call shared by concurrent clicks. */
  const ensureRevealed = (): Promise<Revealed | null> => {
    const cached = revealedRef.current
    if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached)
    if (inflight.current) return inflight.current
    setError(null)
    setConflict(false)
    const request = revealEnvironmentAction(set.id, env.id).then(
      (r) => {
        inflight.current = null
        if (!r.ok) {
          setError(r.status === 429 ? t("revealThrottled") : r.error)
          return null
        }
        const next: Revealed = {
          variables: r.data.variables,
          values: valuesOf(r.data.variables),
          secretKeys: r.data.secretKeys,
          plainKeys: r.data.plainKeys,
          updatedAt: r.data.updatedAt,
          expiresAt: Date.now() + REVEAL_TTL_MS,
        }
        storeRevealed(next)
        setNow(Date.now())
        return next
      },
      () => {
        inflight.current = null
        setError(tc("messages.serverUnreachable"))
        return null
      }
    )
    inflight.current = request
    return request
  }

  /** Showing something (again) restarts the 60 second window. */
  const extend = (r: Revealed) => {
    const at = Date.now()
    storeRevealed({ ...r, expiresAt: at + REVEAL_TTL_MS })
    setNow(at)
  }

  const toggleRow = async (k: string) => {
    if (shown.has(k)) {
      const next = new Set(shown)
      next.delete(k)
      setShown(next)
      if (next.size === 0) setAllShown(false)
      return
    }
    setBusy(k)
    const r = await ensureRevealed()
    setBusy(null)
    if (!r) return
    extend(r)
    setShown((prev) => new Set(prev).add(k))
  }

  const toggleAll = async () => {
    if (allShown) {
      setShown(new Set())
      setAllShown(false)
      return
    }
    setBusy("all")
    const r = await ensureRevealed()
    setBusy(null)
    if (!r) return
    extend(r)
    // Secret-flagged values stay masked until their own eye button.
    setShown((prev) => {
      const next = new Set(prev)
      for (const k of env.keys) if (!isSecret(k)) next.add(k)
      return next
    })
    setAllShown(true)
  }

  const copyRow = (k: string) => {
    const copied = () => toast.success(tc("copyButton.copied", { label: k }))
    const failed = () => toast.error(tc("copyButton.failed", { label: k }))
    const cached = revealedRef.current
    if (cached && cached.expiresAt > Date.now()) {
      void copyToClipboard(cached.values.get(k) ?? "").then((ok) =>
        ok ? copied() : failed()
      )
      return
    }
    // Start the clipboard write inside the click; the value follows.
    let revealFailed = false
    setBusy(k)
    const text = ensureRevealed().then((r) => {
      if (!r) {
        revealFailed = true
        throw new Error("reveal failed")
      }
      return r.values.get(k) ?? ""
    })
    void copyToClipboardLater(text).then((ok) => {
      setBusy(null)
      if (ok) copied()
      // A failed reveal already shows its own message.
      else if (!revealFailed) failed()
    })
  }

  const openEditor = async (fresh = false) => {
    if (fresh) storeRevealed(null)
    setBusy("edit")
    const r = await ensureRevealed()
    setBusy(null)
    if (!r) return
    setShown(new Set())
    setAllShown(false)
    setRevealedFlags({ secretKeys: r.secretKeys, plainKeys: r.plainKeys })
    setEditing(r.variables)
    setVersion(r.updatedAt)
    setEditorKey((k) => k + 1)
  }

  const save = (variables: string, flagsJson: string) =>
    start(async () => {
      setError(null)
      setConflict(false)
      let flags: Record<string, boolean> | undefined
      try {
        flags = flagsJson
          ? (JSON.parse(flagsJson) as Record<string, boolean>)
          : undefined
      } catch {
        flags = undefined
      }
      const r = await updateEnvironmentAction(
        set.id,
        env.id,
        variables,
        version,
        flags
      )
      if (r.ok) {
        setEditing(null)
        forget()
        toast.success(t("saved", { name: env.name }))
        router.refresh()
      } else {
        setError(r.error)
        // Someone else saved in between: offer to load their version.
        setConflict(r.status === 409)
      }
    })

  const secondsLeft = revealed
    ? Math.max(0, Math.ceil((revealed.expiresAt - now) / 1000))
    : 0
  const anyShown = revealed !== null && shown.size > 0
  const maskedSecrets =
    allShown && env.keys.some((k) => isSecret(k) && !shown.has(k))

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        {env.protected && (
          <Badge variant="outline">
            <Lock data-icon="inline-start" />
            {t("protected")}
          </Badge>
        )}
        <span className="text-muted-foreground">
          {t("variableCount", { count: env.keys.length })}
        </span>
      </div>

      {editing === null ? (
        <>
          {env.keys.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            <ul className="divide-y rounded-md border text-xs">
              {env.keys.map((k) => {
                const visible = revealed !== null && shown.has(k)
                const value = revealed?.values.get(k) ?? ""
                const waiting = busy === k
                return (
                  <li
                    key={k}
                    className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-1"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <code className="min-w-0 truncate font-mono" title={k}>
                        {k}
                      </code>
                      {isSecret(k) && (
                        <Badge variant="outline" className="shrink-0">
                          <KeyRound data-icon="inline-start" />
                          {t("secretBadge")}
                        </Badge>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {env.notes?.[k] && (
                        <VariableNotePopover
                          note={env.notes[k]}
                          label={t("noteAria", { name: k })}
                        />
                      )}
                      {!visible && (
                        // On a phone the eye button already says "masked";
                        // the dots would squeeze the name.
                        <span
                          className={cn(
                            "px-1 font-mono text-muted-foreground",
                            canReveal && "hidden sm:inline"
                          )}
                          aria-hidden
                        >
                          ••••••••
                        </span>
                      )}
                      {canReveal && (
                        <>
                          <IconButton
                            label={
                              visible
                                ? t("rowHide", { name: k })
                                : t("rowShow", { name: k })
                            }
                            aria-pressed={visible}
                            disabled={busy !== null && !visible}
                            onClick={() => void toggleRow(k)}
                          >
                            {waiting ? (
                              <Loader2 className="animate-spin" />
                            ) : visible ? (
                              <EyeOff />
                            ) : (
                              <Eye />
                            )}
                          </IconButton>
                          <IconButton
                            label={t("rowCopy", { name: k })}
                            disabled={busy !== null}
                            onClick={() => copyRow(k)}
                          >
                            <Copy />
                          </IconButton>
                        </>
                      )}
                    </span>
                    {visible && (
                      <code className="block max-h-24 basis-full overflow-y-auto rounded bg-muted px-2 py-1 font-mono break-all whitespace-pre-wrap">
                        {value === "" ? (
                          <span className="text-muted-foreground">
                            {t("history.emptyText")}
                          </span>
                        ) : (
                          value
                        )}
                      </code>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {(anyShown || maskedSecrets) && (
            <p
              className="text-xs text-muted-foreground tabular-nums"
              aria-live="polite"
            >
              {anyShown && t("hidesIn", { seconds: secondsLeft })}
              {anyShown && maskedSecrets && " "}
              {maskedSecrets && t("secretsStayMasked")}
            </p>
          )}

          {/* Right-aligned: note, then History, Reveal all and Edit
              (rightmost). On a phone the note takes its own line above the
              buttons. */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <p className="order-1 min-w-0 basis-full text-end text-xs text-muted-foreground sm:flex-1 sm:basis-0">
              {isViewer
                ? t("viewerNote")
                : !canReveal
                  ? t("protectedNote", { name: env.name })
                  : t("revealNote")}
            </p>
            <div className="order-2 flex flex-wrap items-center justify-end gap-2">
              <EnvironmentHistory
                setId={set.id}
                environment={env}
                canReveal={canReveal}
                restoreNote={
                  isViewer
                    ? t("history.viewerNote")
                    : t("history.protectedNote", { name: env.name })
                }
              />
              {!isViewer && env.keys.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => void toggleAll()}
                  disabled={!canReveal || (busy !== null && !allShown)}
                  aria-pressed={allShown}
                >
                  {busy === "all" ? (
                    <Loader2
                      data-icon="inline-start"
                      className="animate-spin"
                    />
                  ) : allShown ? (
                    <EyeOff data-icon="inline-start" />
                  ) : (
                    <Eye data-icon="inline-start" />
                  )}
                  {busy === "all"
                    ? t("revealing")
                    : allShown
                      ? t("hideAll")
                      : t("revealAll")}
                </Button>
              )}
              {!isViewer && (
                <Button
                  variant="outline"
                  onClick={() => void openEditor()}
                  disabled={!canReveal || busy !== null}
                >
                  {busy === "edit" ? (
                    <Loader2
                      data-icon="inline-start"
                      className="animate-spin"
                    />
                  ) : (
                    <Pencil data-icon="inline-start" />
                  )}
                  {busy === "edit" ? t("revealing") : t("edit")}
                </Button>
              )}
            </div>
          </div>
        </>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            save(
              String(data.get("variables") ?? ""),
              String(data.get("flags") ?? "")
            )
          }}
        >
          <EnvEditor
            key={editorKey}
            name="variables"
            defaultValue={editing}
            secrets={{ name: "flags", ...revealedFlags }}
          />
          <Alert>
            <Info />
            <AlertDescription className="[&_p:not(:last-child)]:mb-1">
              <p>{tc("envEditor.secretHint")}</p>
              <p>{t("notesHint")}</p>
              <p>
                {t.rich("editorHint", {
                  ref: "${{vars.KEY}}",
                  code: (chunks) => <code className="font-mono">{chunks}</code>,
                })}
              </p>
            </AlertDescription>
          </Alert>
          {error && (
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2"
              role="alert"
            >
              <p className="min-w-0 text-xs text-destructive">{error}</p>
              {conflict && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending || busy !== null}
                  onClick={() => void openEditor(true)}
                >
                  <RotateCw data-icon="inline-start" />
                  {t("reloadLatest")}
                </Button>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setEditing(null)
                setError(null)
                setConflict(false)
                forget()
              }}
            >
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? tc("states.saving") : tc("actions.save")}
            </Button>
          </div>
        </form>
      )}

      {editing === null && error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      <UsedBy environment={env} others={others} />

      {editing === null && (
        <Alert>
          <Info />
          <AlertDescription>{t("applyNote")}</AlertDescription>
        </Alert>
      )}

      {editing === null && set.canManage && (
        <DangerZoneItem
          title={t("deleteItemTitle")}
          description={t("deleteItemDescription")}
          action={
            <DeleteEnvironment
              setId={set.id}
              environment={env}
              onDeleted={onDeleted}
            />
          }
        />
      )}
    </>
  )
}

/**
 * Applications and stacks (in projects the caller may see) linking this
 * environment. When none does, it names the environments that are linked,
 * so the set-wide count in the header does not look like a contradiction.
 */
function UsedBy({
  environment: env,
  others,
}: {
  environment: EnvironmentView
  others: EnvironmentView[]
}) {
  const t = useTranslations("variables.editor")
  const linked = others
    .filter((o) => o.usedBy.length > 0)
    .map((o) => {
      const apps = o.usedBy.filter((u) => u.kind === "application").length
      const stacks = o.usedBy.length - apps
      const parts = [
        apps > 0 ? t("appsCount", { count: apps }) : null,
        stacks > 0 ? t("stacksCount", { count: stacks }) : null,
      ].filter(Boolean)
      return `${o.name} (${parts.join(", ")})`
    })
  return (
    <section className="space-y-1.5">
      <h3 className="text-xs font-medium">{t("usedByTitle")}</h3>
      {env.usedBy.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("unused", { name: env.name })}
          {linked.length > 0 && (
            <> {t("unusedOthers", { list: linked.join(", ") })}</>
          )}
        </p>
      ) : (
        <ul className="divide-y rounded-md border text-xs">
          {env.usedBy.map((u) => {
            const Icon = u.kind === "application" ? Boxes : Layers
            return (
              <li
                key={`${u.kind}-${u.id}`}
                className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-3 py-1.5"
              >
                <Icon
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <Link
                  href={
                    u.kind === "application"
                      ? `/applications/${u.id}`
                      : `/compose/${u.id}`
                  }
                  className="min-w-0 truncate font-medium underline-offset-4 hover:underline"
                >
                  {u.name}
                </Link>
                <span className="min-w-0 truncate text-muted-foreground">
                  {u.projectName}
                </span>
                <span className="ms-auto shrink-0 text-muted-foreground tabular-nums">
                  {t("linkPosition", { position: u.position + 1 })}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function AddEnvironment({
  setId,
  onCreated,
}: {
  setId: string
  onCreated: (id: string) => void
}) {
  const t = useTranslations("variables.editor")
  const tc = useTranslations("common")
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [isProtected, setProtected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const valid = ENVIRONMENT_NAME.test(name)

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) {
          setName("")
          setProtected(false)
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus data-icon="inline-start" />
          {t("add")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              setError(null)
              const r = await createEnvironmentAction(setId, name, isProtected)
              if (r.ok) {
                onCreated(r.data.id)
                setOpen(false)
                router.refresh()
              } else setError(r.error)
            })
          }}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>{t("addTitle")}</DialogTitle>
            <DialogDescription>{t("addDescription")}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="env-name">{tc("labels.name")}</FieldLabel>
            <Input
              id="env-name"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase())}
              placeholder={t("namePlaceholder")}
              maxLength={32}
              autoComplete="off"
              autoFocus
              className="font-mono"
            />
            <FieldDescription>{t("nameHint")}</FieldDescription>
          </Field>
          <Field orientation="horizontal">
            <Switch
              id="env-protected"
              checked={isProtected}
              onCheckedChange={setProtected}
            />
            <div className="space-y-0.5">
              <FieldLabel htmlFor="env-protected">
                {t("protectedLabel")}
              </FieldLabel>
              <FieldDescription>{t("protectedHint")}</FieldDescription>
            </div>
          </Field>
          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" disabled={pending || !valid}>
              {pending ? tc("states.creating") : t("addSubmit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteEnvironment({
  setId,
  environment: env,
  onDeleted,
}: {
  setId: string
  environment: EnvironmentView
  onDeleted: () => void
}) {
  const t = useTranslations("variables.editor")
  const tc = useTranslations("common")
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  // usedBy only lists projects the caller sees; the API names every user on a 409.
  const inUse = env.usedBy.length > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 data-icon="inline-start" />
          {t("delete")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("deleteTitle", { name: env.name })}</DialogTitle>
          <DialogDescription>
            {inUse
              ? t("deleteInUse", {
                  apps: env.usedBy.map((u) => u.name).join(", "),
                })
              : t("deleteDescription")}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {tc("actions.cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={pending || inUse}
            onClick={() =>
              start(async () => {
                setError(null)
                const r = await deleteEnvironmentAction(setId, env.id)
                if (r.ok) {
                  setOpen(false)
                  onDeleted()
                  router.refresh()
                } else setError(r.error)
              })
            }
          >
            {pending ? tc("states.deleting") : tc("actions.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
