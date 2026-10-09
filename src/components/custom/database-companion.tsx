"use client"

import {
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { useBrowserHost } from "@/components/custom/use-browser-host"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
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
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  deleteCompanionAction,
  getCompanionCredentialsAction,
  installCompanionAction,
} from "@/features/database-companion/database-companion.actions"
import type {
  CompanionCredentials,
  CompanionTool,
  DatabaseCompanion,
} from "@/features/database-companion/database-companion.entity"
import { createCompanionSchema } from "@/features/database-companion/database-companion.schema"
import type { ManagedDatabaseDetail } from "@/features/managed-database/managed-database.entity"
import { copyToClipboard } from "@/lib/clipboard"
import { cn } from "@/lib/utils"

export function DatabaseCompanionCard({
  db,
  companion,
  tools,
  running,
}: {
  db: ManagedDatabaseDetail
  companion: DatabaseCompanion | null
  tools: CompanionTool[]
  running: boolean
}) {
  const t = useTranslations("database")
  const tc = useTranslations("common")
  const router = useRouter()
  const canManage = db.projectRole !== "viewer"
  const [installOpen, setInstallOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pending, start] = useTransition()
  const [creds, setCreds] = useState<CompanionCredentials | null>(null)
  const browserHost = useBrowserHost()

  const status = companion?.status
  // Refresh until the API reports a terminal status (same pattern as the database panel).
  useEffect(() => {
    if (status !== "creating") return
    const t = setInterval(() => router.refresh(), 3000)
    return () => clearInterval(t)
  }, [status, router])

  // Credentials live only in memory and are dropped when the companion changes.
  const companionId = companion?.id
  const [credsFor, setCredsFor] = useState(companionId)
  if (credsFor !== companionId) {
    setCredsFor(companionId)
    setCreds(null)
  }

  if (!companion && tools.length === 0) return null

  const tool = companion
    ? tools.find((x) => x.id === companion.tool)
    : undefined
  const toolLabel = tool?.label ?? companion?.tool ?? ""
  const url = companion
    ? (companion.url ??
      (companion.hostPort && browserHost
        ? `http://${browserHost}:${companion.hostPort}`
        : null))
    : null

  const showCreds = () =>
    start(async () => {
      const r = await getCompanionCredentialsAction(db.id)
      if (r.ok) setCreds(r.data)
      else toast.error(r.error)
    })

  const remove = () =>
    start(async () => {
      const r = await deleteCompanionAction(db.id)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(t("companion.toast.removed"))
      setDeleteOpen(false)
      router.refresh()
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("companion.title")}</CardTitle>
        <CardDescription>
          {t("companion.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {!companion ? (
          <div className="space-y-2">
            <p className="text-muted-foreground">
              {t("companion.empty")}
            </p>
            {canManage ? (
              <>
                <Button
                  disabled={!running}
                  onClick={() => setInstallOpen(true)}
                >
                  <Plus data-icon="inline-start" />
                  {t("companion.install")}
                </Button>
                {!running && (
                  <p className="text-muted-foreground">
                    {t("companion.startDatabaseFirst")}
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">
                {t("companion.developerOnly")}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{toolLabel}</span>
              <Badge
                variant={
                  companion.status === "error"
                    ? "destructive"
                    : companion.status === "running"
                      ? "default"
                      : "secondary"
                }
              >
                {companion.status === "creating" && (
                  <Loader2 className="animate-spin" />
                )}
                {t(`companion.status.${companion.status}`)}
              </Badge>
            </div>
            {companion.status === "error" && companion.errorMessage && (
              <p
                className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive"
                role="alert"
              >
                {companion.errorMessage}
              </p>
            )}
            {url && (
              <div className="flex min-w-0 items-center gap-2">
                <span className="w-20 shrink-0 text-muted-foreground">{tc("labels.url")}</span>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("companion.openInNewTab", { tool: toolLabel })}
                  className="flex min-w-0 items-center gap-1 font-mono hover:underline"
                >
                  <span className="truncate">{url}</span>
                  <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                </a>
              </div>
            )}
            {canManage && (
              <div className="space-y-2">
                {tool?.usesDatabaseLogin ? (
                  <p className="text-muted-foreground">
                    {t("companion.databaseLoginHint")}
                  </p>
                ) : creds ? (
                  <div className="space-y-2">
                    <CredRow
                      kind="username"
                      label={t("companion.credentials.user")}
                      value={creds.username}
                    />
                    <CredRow
                      kind="password"
                      label={tc("labels.password")}
                      value={creds.password}
                    />
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  {!tool?.usesDatabaseLogin &&
                    (creds ? (
                      <Button variant="outline" onClick={() => setCreds(null)}>
                        <EyeOff data-icon="inline-start" />
                        {t("companion.credentials.hide")}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        disabled={pending}
                        onClick={showCreds}
                      >
                        <Eye data-icon="inline-start" />
                        {t("companion.credentials.show")}
                      </Button>
                    ))}
                  <Button
                    variant="destructive"
                    disabled={pending}
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 data-icon="inline-start" />
                    {t("companion.remove")}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {canManage && (
        <InstallDialog
          open={installOpen}
          onOpenChange={setInstallOpen}
          dbId={db.id}
          tools={tools}
        />
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("companion.removeDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("companion.removeDialog.description", { tool: toolLabel })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {tc("actions.cancel")}
            </Button>
            <Button variant="destructive" disabled={pending} onClick={remove}>
              {pending && (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              )}
              {tc("actions.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function CredRow({
  kind,
  label,
  value,
}: {
  kind: "username" | "password"
  label: string
  value: string | null
}) {
  const t = useTranslations("database")
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <code className="min-w-0 flex-1 truncate rounded bg-muted px-1.5 py-0.5 text-xs">
        {value ?? "-"}
      </code>
      {value && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("companion.credentials.copyAria", { label })}
          onClick={() =>
            void copyToClipboard(value).then((ok) =>
              ok
                ? toast.success(t(`companion.credentials.copied.${kind}`))
                : toast.error(t(`companion.credentials.copyFailed.${kind}`))
            )
          }
        >
          <Copy />
        </Button>
      )}
    </div>
  )
}

type Access = "domain" | "port"

function InstallDialog({
  open,
  onOpenChange,
  dbId,
  tools,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  dbId: string
  tools: CompanionTool[]
}) {
  const t = useTranslations("database")
  const tc = useTranslations("common")
  const schema = useMemo(() => createCompanionSchema(t), [t])
  const router = useRouter()
  const [pending, start] = useTransition()
  const toastId = useRef<string | number | undefined>(undefined)
  const [tool, setTool] = useState("")
  const [access, setAccess] = useState<Access>("domain")
  const [host, setHost] = useState("")
  const [https, setHttps] = useState(true)
  const [hostPort, setHostPort] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = schema.safeParse({
      tool,
      access,
      host,
      https,
      hostPort,
    })
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const i of parsed.error.issues) {
        next[String(i.path[0])] ??= i.message
      }
      return setErrors(next)
    }
    setErrors({})
    toastId.current = toast.loading(t("companion.toast.installing"))
    start(async () => {
      const r = await installCompanionAction(dbId, parsed.data)
      if (!r.ok) {
        toast.error(r.error, { id: toastId.current })
        return
      }
      toast.success(t("companion.toast.installed"), { id: toastId.current })
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
        showCloseButton={!pending}
      >
        <DialogHeader>
          <DialogTitle>{t("companion.installDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("companion.installDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <Label id="companion-tool-label">{t("companion.installDialog.tool")}</Label>
            <div
              role="radiogroup"
              aria-labelledby="companion-tool-label"
              className="space-y-2"
            >
              {tools.map((x) => (
                <Choice
                  key={x.id}
                  checked={tool === x.id}
                  onSelect={() => setTool(x.id)}
                  title={x.label}
                  description={x.description}
                  note={
                    x.usesDatabaseLogin
                      ? t("companion.installDialog.noteDatabaseLogin")
                      : t("companion.installDialog.noteGeneratedPassword")
                  }
                />
              ))}
            </div>
            {errors.tool && (
              <p className="text-destructive" role="alert">
                {errors.tool}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label id="companion-access-label">{t("companion.installDialog.access")}</Label>
            <div
              role="radiogroup"
              aria-labelledby="companion-access-label"
              className="grid gap-2 sm:grid-cols-2"
            >
              <Choice
                checked={access === "domain"}
                onSelect={() => setAccess("domain")}
                title={t("companion.installDialog.domain.title")}
                description={t("companion.installDialog.domain.description")}
              />
              <Choice
                checked={access === "port"}
                onSelect={() => setAccess("port")}
                title={t("companion.installDialog.port.title")}
                description={t("companion.installDialog.port.description")}
              />
            </div>
          </div>

          {access === "domain" ? (
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="companion-host">{t("companion.installDialog.hostname")}</Label>
                <Input
                  id="companion-host"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="db.example.com"
                  aria-invalid={!!errors.host}
                />
                {errors.host && (
                  <p className="text-destructive" role="alert">
                    {errors.host}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="companion-https"
                  checked={https}
                  onCheckedChange={setHttps}
                />
                <Label htmlFor="companion-https">HTTPS</Label>
              </div>
              <p className="text-muted-foreground">
                {t("companion.installDialog.domainHint")}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="companion-port">{t("companion.installDialog.hostPort")}</Label>
              <Input
                id="companion-port"
                inputMode="numeric"
                value={hostPort}
                onChange={(e) => setHostPort(e.target.value)}
                placeholder="8081"
                aria-invalid={!!errors.hostPort}
              />
              {errors.hostPort && (
                <p className="text-destructive" role="alert">
                  {errors.hostPort}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              )}
              {pending ? t("companion.installDialog.installing") : t("companion.installDialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Choice({
  checked,
  onSelect,
  title,
  description,
  note,
}: {
  checked: boolean
  onSelect: () => void
  title: string
  description: string
  note?: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border p-2 text-left text-xs transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        checked && "border-primary bg-muted"
      )}
    >
      <span className="block text-sm font-medium">{title}</span>
      <span className="block text-muted-foreground">{description}</span>
      {note && <span className="mt-1 block">{note}</span>}
    </button>
  )
}
