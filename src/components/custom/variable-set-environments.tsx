"use client"

import {
  Boxes,
  Eye,
  Info,
  KeyRound,
  Layers,
  Lock,
  Plus,
  RotateCw,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { DangerZoneItem } from "@/components/custom/danger-zone"
import { EnvEditor } from "@/components/custom/env-editor"
import { EnvironmentCompare } from "@/components/custom/environment-compare"
import { EnvironmentHistory } from "@/components/custom/environment-history"
import { PageTabsTrigger } from "@/components/custom/page-tabs-trigger"
import { ScrollableTabsList } from "@/components/custom/scrollable-tabs-list"
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
import { useRouter } from "@/lib/use-router"
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
                </PageTabsTrigger>
              ))}
            </ScrollableTabsList>
            {environments.map((e) => (
              <TabsContent key={e.id} value={e.id} className="space-y-4 pt-4">
                <EnvironmentPanel
                  set={set}
                  environment={e}
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

function EnvironmentPanel({
  set,
  environment: env,
  onDeleted,
}: {
  set: VariableSetDetail
  environment: EnvironmentView
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
  const isViewer = set.role === "viewer"
  const canReveal = canRevealEnvironment(set.role, env)

  const reveal = () =>
    start(async () => {
      setError(null)
      setConflict(false)
      const r = await revealEnvironmentAction(set.id, env.id)
      if (r.ok) {
        setRevealedFlags({
          secretKeys: r.data.secretKeys,
          plainKeys: r.data.plainKeys,
        })
        setEditing(r.data.variables)
        setVersion(r.data.updatedAt)
        setEditorKey((k) => k + 1)
      } else setError(r.error)
    })

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
        toast.success(t("saved", { name: env.name }))
        router.refresh()
      } else {
        setError(r.error)
        // Someone else saved in between: offer to load their version.
        setConflict(r.status === 409)
      }
    })

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
              {env.keys.map((k) => (
                <li
                  key={k}
                  className="flex items-center justify-between gap-3 px-3 py-1.5"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <code className="min-w-0 truncate font-mono">{k}</code>
                    {env.secretKeys.includes(k) && (
                      <Badge variant="outline" className="shrink-0">
                        <KeyRound data-icon="inline-start" />
                        {t("secretBadge")}
                      </Badge>
                    )}
                  </span>
                  <span
                    className="shrink-0 font-mono text-muted-foreground"
                    aria-hidden
                  >
                    ••••••••
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Right-aligned: note, then History, then Reveal (rightmost). On a
              phone the note takes its own line above the buttons. */}
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
              {!isViewer && (
                <Button
                  variant="outline"
                  onClick={reveal}
                  disabled={!canReveal || pending}
                >
                  <Eye data-icon="inline-start" />
                  {pending ? t("revealing") : t("reveal")}
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
                  disabled={pending}
                  onClick={reveal}
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

      <UsedBy environment={env} />

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

/** Applications and stacks (in projects the caller may see) linking this environment. */
function UsedBy({ environment: env }: { environment: EnvironmentView }) {
  const t = useTranslations("variables.editor")
  return (
    <section className="space-y-1.5">
      <h3 className="text-xs font-medium">{t("usedByTitle")}</h3>
      {env.usedBy.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("unused")}</p>
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
