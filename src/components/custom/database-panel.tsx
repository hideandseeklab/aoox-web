"use client"

import { Database, Eye, EyeOff, Play, Plus, Square, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import { DetailList } from "@/components/custom/detail-list"
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SchemaInfo } from "@/features/managed-database/data-browser.entity"
import {
  createSchemaAction,
  dropSchemaAction,
} from "@/features/managed-database/data-browser.actions"
import {
  startDatabaseAction,
  stopDatabaseAction,
} from "@/features/managed-database/managed-database.actions"
import type {
  DatabaseConnection,
  ManagedDatabaseDetail,
} from "@/features/managed-database/managed-database.entity"

/** Swaps the database name at the end of a connection URL (`…:5432/app` → `…:5432/reports`). */
function withDatabase(url: string, name: string): string {
  return url.replace(/\/[^/?#]*(?=[?#]|$)/, `/${name}`)
}

export function DatabasePanel({
  db,
  connection: primary,
  schemas = [],
  canManageDatabases = false,
}: {
  db: ManagedDatabaseDetail
  connection: DatabaseConnection
  /** Other databases on the same server (see the Data tab); primary first. */
  schemas?: SchemaInfo[]
  /** Owner/admin on a running SQL/Mongo server: add or drop databases on it. */
  canManageDatabases?: boolean
}) {
  const t = useTranslations("database")
  const tc = useTranslations("common")
  const router = useRouter()
  // Same host/user/password for every database on the server; only the
  // name (and thus the URL path) changes with the selection.
  const [selected, setSelected] = useState(primary.database)
  const connection: DatabaseConnection =
    selected && selected !== primary.database
      ? {
          ...primary,
          database: selected,
          internalUrl: withDatabase(primary.internalUrl, selected),
          externalUrl: primary.externalUrl
            ? withDatabase(primary.externalUrl, selected)
            : null,
        }
      : primary
  const [reveal, setReveal] = useState(false)

  // While provisioning, refresh until the API reports a terminal status.
  useEffect(() => {
    if (db.status !== "creating") return
    const t = setInterval(() => router.refresh(), 3000)
    return () => clearInterval(t)
  }, [db.status, router])

  const mask = (s: string) =>
    reveal ? s : s.replace(/:[^:@/]+@/, ":••••••••@")

  return (
    <div className="space-y-4">
      {db.status === "error" && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {t("panel.createFailed", { error: db.errorMessage ?? "" })}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("panel.title")}</CardTitle>
          <CardDescription>{t("panel.description")}</CardDescription>
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReveal((r) => !r)}
            >
              {reveal ? (
                <EyeOff data-icon="inline-start" />
              ) : (
                <Eye data-icon="inline-start" />
              )}
              {reveal ? t("panel.hidePassword") : t("panel.showPassword")}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-6">
          {(schemas.length > 1 || canManageDatabases) && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Database className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {t("panel.connectionFor")}
              </span>
              <Select value={selected ?? ""} onValueChange={setSelected}>
                <SelectTrigger size="sm" className="w-64 font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {schemas.map((s) => (
                    <SelectItem key={s.name} value={s.name}>
                      {s.name}
                      {s.isPrimary && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {t("panel.primary")}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canManageDatabases &&
                selected &&
                selected !== primary.database && (
                  <DropDatabaseDialog
                    databaseId={db.id}
                    name={selected}
                    onDropped={() => {
                      setSelected(primary.database)
                      router.refresh()
                    }}
                  />
                )}
              {canManageDatabases && (
                <AddDatabaseDialog
                  databaseId={db.id}
                  onCreated={(name) => {
                    setSelected(name)
                    router.refresh()
                  }}
                />
              )}
            </div>
          )}

          <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
            <section className="min-w-0 space-y-3">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">
                  {t("panel.internal.title")}
                </h3>
                <p className="text-xs/relaxed text-muted-foreground">
                  {t.rich("panel.internal.description", {
                    code: (chunks) => <code>{chunks}</code>,
                  })}
                </p>
              </div>
              <DetailList
                items={[
                  {
                    label: tc("labels.host"),
                    value: connection.internalHost,
                    mono: true,
                  },
                  {
                    label: tc("labels.port"),
                    value: String(connection.internalPort),
                    mono: true,
                  },
                  ...(connection.database
                    ? [
                        {
                          label: t("panel.fields.database"),
                          value: connection.database,
                          mono: true,
                        },
                      ]
                    : []),
                  {
                    label: t("panel.fields.user"),
                    value: connection.username,
                    mono: true,
                  },
                  {
                    label: tc("labels.password"),
                    value: reveal ? connection.password : "••••••••",
                    mono: true,
                    copy: connection.password,
                  },
                  {
                    label: tc("labels.url"),
                    value: mask(connection.internalUrl),
                    mono: true,
                    copy: connection.internalUrl,
                  },
                ]}
              />
            </section>
            <section className="min-w-0 space-y-3">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">
                  {t("panel.external.title")}
                </h3>
                <p className="text-xs/relaxed text-muted-foreground">
                  {connection.externalUrl
                    ? connection.externalLoopbackOnly
                      ? t("panel.external.publishedLoopback", {
                          port: connection.externalPort ?? 0,
                        })
                      : t("panel.external.published", {
                          port: connection.externalPort ?? 0,
                        })
                    : t("panel.external.notPublished")}
                </p>
              </div>
              {connection.externalUrl ? (
                <DetailList
                  items={[
                    {
                      label: tc("labels.host"),
                      value: connection.externalHost ?? "",
                      mono: true,
                    },
                    {
                      label: tc("labels.port"),
                      value: String(connection.externalPort),
                      mono: true,
                    },
                    {
                      label: tc("labels.url"),
                      value: mask(connection.externalUrl),
                      mono: true,
                      copy: connection.externalUrl,
                    },
                  ]}
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("panel.external.recreateHint")}
                </p>
              )}
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/** "Add database": creates another database on the same server (POST /databases/:id/schemas). */
function AddDatabaseDialog({
  databaseId,
  onCreated,
}: {
  databaseId: string
  onCreated: (name: string) => void
}) {
  const t = useTranslations("database")
  const tc = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const submit = () =>
    start(async () => {
      const value = name.trim()
      if (!value) return
      setError(null)
      const r = await createSchemaAction(databaseId, value)
      if (!r.ok) return setError(r.error)
      setOpen(false)
      setName("")
      onCreated(r.data.name)
    })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setName("")
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus data-icon="inline-start" />
          {t("panel.add.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("panel.add.title")}</DialogTitle>
          <DialogDescription>{t("panel.add.description")}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("panel.add.placeholder")}
            className="font-mono"
            aria-label={t("panel.add.ariaLabel")}
            autoFocus
          />
          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending || !name.trim()}>
              {tc("actions.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Confirmation to drop one extra database on the server (DELETE /databases/:id/schemas/:name). */
function DropDatabaseDialog({
  databaseId,
  name,
  onDropped,
}: {
  databaseId: string
  name: string
  onDropped: () => void
}) {
  const t = useTranslations("database")
  const tc = useTranslations("common")
  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("panel.drop.ariaLabel", { name })}
        >
          <Trash2 />
        </Button>
      }
      title={t("panel.drop.title", { name })}
      description={
        <>
          {t.rich("panel.drop.description", {
            name,
            code: (chunks) => <code>{chunks}</code>,
          })}
        </>
      }
      confirmLabel={tc("actions.delete")}
      onConfirm={async () => {
        const r = await dropSchemaAction(databaseId, name)
        if (r.ok) onDropped()
        return r
      }}
    />
  )
}

/**
 * Start/Stop for the database's status strip. Shown whenever the container exists, exactly as the
 * button used to be on the Overview toolbar; a failure message sits beside it.
 */
export function DatabaseStartStop({ db }: { db: ManagedDatabaseDetail }) {
  const tc = useTranslations("common")
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  if (!db.container) return null
  const running = db.container.state === "running"
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? tc("messages.genericError"))
      else router.refresh()
    })

  return (
    <>
      {running ? (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run(() => stopDatabaseAction(db.id))}
        >
          <Square data-icon="inline-start" />
          {tc("actions.stop")}
        </Button>
      ) : (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run(() => startDatabaseAction(db.id))}
        >
          <Play data-icon="inline-start" />
          {tc("actions.start")}
        </Button>
      )}
      {error && (
        <span className="self-center text-xs text-destructive" role="alert">
          {error}
        </span>
      )}
    </>
  )
}
