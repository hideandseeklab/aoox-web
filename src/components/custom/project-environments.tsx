"use client"

import { Eye, KeyRound, Lock, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { EnvEditor } from "@/components/custom/env-editor"
import { EnvironmentCompare } from "@/components/custom/environment-compare"
import { EnvironmentHistory } from "@/components/custom/environment-history"
import { PageTabsTrigger } from "@/components/custom/page-tabs-trigger"
import { ScrollableTabsList } from "@/components/custom/scrollable-tabs-list"
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
import { Tabs, TabsContent } from "@/components/ui/tabs"
import {
  createEnvironmentAction,
  deleteEnvironmentAction,
  revealEnvironmentAction,
  updateEnvironmentAction,
} from "@/features/project/project-environment.actions"
import {
  PRODUCTION_ENVIRONMENT,
  type ProjectEnvironment,
} from "@/features/project/project-environment.entity"
import type { ProjectRole } from "@/features/project-member/project-member.entity"

/** Role of the viewer in this project; `null` when it could not be read (treated as a developer, the API decides). */
type Role = ProjectRole | null

/**
 * The project's environments (development, staging, production, ...): one tab
 * each, with the variable names and masked values. Values only leave the API
 * through the audited reveal action, and a protected environment (production)
 * needs a project admin. Viewers see names and counts only.
 */
export function ProjectEnvironments({
  projectId,
  environments,
  role,
}: {
  projectId: string
  environments: ProjectEnvironment[]
  role: Role
}) {
  const t = useTranslations("projects.environments")
  const [selected, setSelected] = useState(
    () =>
      environments.find((e) => e.name === PRODUCTION_ENVIRONMENT)?.id ??
      environments[0]?.id ??
      ""
  )
  const current = environments.some((e) => e.id === selected)
    ? selected
    : (environments[0]?.id ?? "")
  const isViewer = role === "viewer"
  const isAdmin = role === "admin"

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription className="col-span-2 col-start-1 row-start-2 sm:col-span-1">
          {t("description")}
        </CardDescription>
        {(!isViewer || environments.length > 1) && (
          // Under the description on a phone, on the right from sm up.
          <CardAction className="col-start-1 row-span-1 row-start-3 mt-2 flex flex-wrap gap-2 justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:justify-self-end">
            {environments.length > 1 && (
              <EnvironmentCompare
                projectId={projectId}
                environments={environments}
              />
            )}
            {!isViewer && (
              <AddEnvironment
                projectId={projectId}
                onCreated={(id) => setSelected(id)}
              />
            )}
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
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
                projectId={projectId}
                environment={e}
                isViewer={isViewer}
                isAdmin={isAdmin}
                onDeleted={() => setSelected("")}
              />
            </TabsContent>
          ))}
        </Tabs>
        <p className="mt-4 text-xs text-muted-foreground">{t("applyNote")}</p>
      </CardContent>
    </Card>
  )
}

function EnvironmentPanel({
  projectId,
  environment: env,
  isViewer,
  isAdmin,
  onDeleted,
}: {
  projectId: string
  environment: ProjectEnvironment
  isViewer: boolean
  isAdmin: boolean
  onDeleted: () => void
}) {
  const t = useTranslations("projects.environments")
  const tc = useTranslations("common")
  const [pending, start] = useTransition()
  const [editing, setEditing] = useState<string | null>(null)
  // Secret flags as revealed with the values; the editor reports the changes.
  const [revealedFlags, setRevealedFlags] = useState<{
    secretKeys: string[]
    plainKeys: string[]
  }>({ secretKeys: [], plainKeys: [] })
  // Version of the text being edited; the save is refused if it changed since.
  const [version, setVersion] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  // Protected environments: project admins only. Others: developers and up.
  const canReveal = isAdmin || (!isViewer && !env.protected)
  const canDelete = isAdmin && env.name !== PRODUCTION_ENVIRONMENT

  const reveal = () =>
    start(async () => {
      setError(null)
      const r = await revealEnvironmentAction(projectId, env.id)
      if (r.ok) {
        setRevealedFlags({
          secretKeys: r.data.secretKeys,
          plainKeys: r.data.plainKeys,
        })
        setEditing(r.data.variables)
        setVersion(r.data.updatedAt)
      } else setError(r.error)
    })

  const save = (variables: string, flagsJson: string) =>
    start(async () => {
      setError(null)
      let flags: Record<string, boolean> | undefined
      try {
        flags = flagsJson
          ? (JSON.parse(flagsJson) as Record<string, boolean>)
          : undefined
      } catch {
        flags = undefined
      }
      const r = await updateEnvironmentAction(
        projectId,
        env.id,
        variables,
        version,
        flags
      )
      if (r.ok) {
        setEditing(null)
        toast.success(t("saved", { name: env.name }))
      } else setError(r.error)
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
        <span className="text-muted-foreground">
          {env.usedBy.length === 0 ? (
            t("unused")
          ) : (
            <>
              {t("usedBy")}{" "}
              {env.usedBy.map((u, i) => (
                <span key={`${u.kind}-${u.id}`}>
                  {i > 0 && ", "}
                  <Link
                    href={
                      u.kind === "application"
                        ? `/applications/${u.id}`
                        : `/compose/${u.id}`
                    }
                    className="text-foreground underline-offset-4 hover:underline"
                  >
                    {u.name}
                  </Link>
                </span>
              ))}
            </>
          )}
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

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
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
              <EnvironmentHistory
                projectId={projectId}
                environment={env}
                canRestore={canReveal}
                restoreNote={
                  isViewer
                    ? t("history.viewerNote")
                    : t("history.protectedNote", { name: env.name })
                }
              />
              <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                {isViewer
                  ? t("viewerNote")
                  : !canReveal
                    ? t("protectedNote", { name: env.name })
                    : t("revealNote")}
              </p>
            </div>
            {canDelete && (
              <DeleteEnvironment
                projectId={projectId}
                environment={env}
                onDeleted={onDeleted}
              />
            )}
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
            name="variables"
            defaultValue={editing}
            secrets={{ name: "flags", ...revealedFlags }}
          />
          <p className="text-xs text-muted-foreground">
            {t.rich("editorHint", {
              ref: "${{project.KEY}}",
              code: (chunks) => <code>{chunks}</code>,
            })}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setEditing(null)
                setError(null)
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

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </>
  )
}

function AddEnvironment({
  projectId,
  onCreated,
}: {
  projectId: string
  onCreated: (id: string) => void
}) {
  const t = useTranslations("projects.environments")
  const tc = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const valid = /^[a-z0-9-]{1,32}$/.test(name)

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) {
          setName("")
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
              const r = await createEnvironmentAction(projectId, name)
              if (r.ok) {
                onCreated(r.data.id)
                setOpen(false)
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
  projectId,
  environment: env,
  onDeleted,
}: {
  projectId: string
  environment: ProjectEnvironment
  onDeleted: () => void
}) {
  const t = useTranslations("projects.environments")
  const tc = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
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
                const r = await deleteEnvironmentAction(projectId, env.id)
                if (r.ok) {
                  setOpen(false)
                  onDeleted()
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
