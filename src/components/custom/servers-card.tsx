"use client"

import { Copy, Plug, Plus, ServerIcon, Trash2 } from "lucide-react"
import { useActionState, useState, useTransition } from "react"
import { toast } from "sonner"
import { ServerProxyPanel } from "@/components/custom/server-proxy-panel"
import { EmptyState } from "@/components/custom/empty-state"
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  createServerAction,
  deleteServerAction,
  testServerAction,
  type ServerFormState,
} from "@/features/server/server.actions"
import type {
  PlatformSshKey,
  Server,
  ServerTestResult,
} from "@/features/server/server.entity"
import { copyToClipboard } from "@/lib/clipboard"
import { formatDateTime } from "@/i18n/format"
import { useLocale, useTranslations } from "next-intl"

const when = (iso: string | null, locale: string) =>
  iso
    ? formatDateTime(iso, locale, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null

/**
 * Status from the API's once-a-minute reachability check, read from the row:
 * opening this page does not call any server. "Down" is declared after two
 * failed checks in a row, so a single blip never shows here.
 */
function ServerHealthLine({ server }: { server: Server }) {
  const locale = useLocale()
  const t = useTranslations("infra.servers")
  const { status, checkedAt, since, error, monitoredContainers } = server.health
  const label =
    status === "up"
      ? t("health.up")
      : status === "down"
        ? t("health.down")
        : t("health.unchecked")
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <Badge
        variant={
          status === "up"
            ? "default"
            : status === "down"
              ? "destructive"
              : "secondary"
        }
      >
        {label}
      </Badge>
      {checkedAt && (
        <span>{t("health.checked", { time: when(checkedAt, locale) ?? "" })}</span>
      )}
      {status === "down" && since && (
        <span>{t("health.since", { time: when(since, locale) ?? "" })}</span>
      )}
      {monitoredContainers !== null && status !== "down" && (
        <span>{t("health.monitored", { count: monitoredContainers })}</span>
      )}
      {status === "down" && error && (
        <span className="truncate text-destructive" title={error}>
          {error}
        </span>
      )}
    </div>
  )
}

/**
 * Settings card for remote servers: the platform's
 * public key to authorize on each VPS, the server list with a connection test,
 * and the add dialog.
 */
export function ServersCard({
  servers,
  platformKey,
}: {
  servers: Server[]
  platformKey: PlatformSshKey
}) {
  const t = useTranslations("infra.servers")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tests, setTests] = useState<Record<string, ServerTestResult>>({})

  const test = (id: string) =>
    start(async () => {
      setError(null)
      const r = await testServerAction(id)
      if (r.ok) setTests((t) => ({ ...t, [id]: r.data }))
      else setError(r.error)
    })

  const remove = (id: string) =>
    start(async () => {
      setError(null)
      const r = await deleteServerAction(id)
      if (!r.ok) setError(r.error)
    })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <AddServerDialog />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div className="space-y-1.5">
          <p className="text-muted-foreground">
            {t("runOnce")}
          </p>
          {platformKey.authorizeCommand ? (
            <CommandBox
              label={t("commandLabel")}
              value={platformKey.authorizeCommand}
            />
          ) : (
            <p className="text-destructive" role="alert">
              {platformKey.error ?? t("keyUnavailable")}
            </p>
          )}
        </div>

        {servers.length === 0 ? (
          <EmptyState icon={ServerIcon} compact>
            {t("empty")}
          </EmptyState>
        ) : (
          <ul className="divide-y rounded-md border">
            {servers.map((s) => {
              const result = tests[s.id]
              return (
                <li key={s.id} className="space-y-2 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <ServerIcon className="size-4 text-muted-foreground" />
                    <span className="font-medium">{s.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {s.username}@{s.host}:{s.port}
                      {s.hasOwnKey ? ` · ${t("ownKey")}` : ""}
                    </span>
                    <span className="ms-auto" />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("testConnection", { name: s.name })}
                      disabled={pending}
                      onClick={() => test(s.id)}
                    >
                      <Plug />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("delete", { name: s.name })}
                      disabled={pending}
                      onClick={() => remove(s.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <ServerHealthLine server={s} />
                  <ServerProxyPanel server={s} />
                  {result && (
                    <div className="space-y-1.5 text-xs">
                      <p
                        className={
                          result.ok ? "text-foreground" : "text-destructive"
                        }
                      >
                        {result.message}
                      </p>
                      {result.authorizeCommand && (
                        <CommandBox
                          label={t("commandLabel")}
                          value={result.authorizeCommand}
                        />
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {error && (
          <p className="text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function CommandBox({ label, value }: { label: string; value: string }) {
  const t = useTranslations("infra.servers")
  return (
    <div className="flex items-start gap-2">
      <pre className="min-w-0 flex-1 overflow-x-auto rounded bg-muted px-2 py-1.5 font-mono text-xs break-all whitespace-pre-wrap">
        {value}
      </pre>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("copy", { label })}
        onClick={() =>
          void copyToClipboard(value).then((ok) =>
            ok
              ? toast.success(t("copied", { label }))
              : toast.error(t("copyFailed", { label }))
          )
        }
      >
        <Copy />
      </Button>
    </div>
  )
}

const initialState: ServerFormState = {}

function AddServerDialog() {
  const t = useTranslations("infra.servers")
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(
    async (prev: ServerFormState, formData: FormData) => {
      const next = await createServerAction(prev, formData)
      if (next.created) setOpen(false)
      return next
    },
    initialState
  )
  const errs = (k: keyof NonNullable<ServerFormState["fieldErrors"]>) =>
    state.fieldErrors?.[k]?.map((message) => ({ message }))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus data-icon="inline-start" />
          {t("add.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("add.title")}</DialogTitle>
          <DialogDescription>
            {t("add.description")}
          </DialogDescription>
        </DialogHeader>
        <form action={action} noValidate>
          <FieldGroup>
            <Field data-invalid={!!state.fieldErrors?.name || undefined}>
              <FieldLabel htmlFor="srv-name">{t("add.name")}</FieldLabel>
              <Input
                id="srv-name"
                name="name"
                defaultValue={state.values?.name}
                required
              />
              <FieldError errors={errs("name")} />
            </Field>
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <Field data-invalid={!!state.fieldErrors?.host || undefined}>
                <FieldLabel htmlFor="srv-host">{t("add.host")}</FieldLabel>
                <Input
                  id="srv-host"
                  name="host"
                  placeholder="203.0.113.10"
                  defaultValue={state.values?.host}
                  required
                />
                <FieldError errors={errs("host")} />
              </Field>
              <Field data-invalid={!!state.fieldErrors?.port || undefined}>
                <FieldLabel htmlFor="srv-port">{t("add.port")}</FieldLabel>
                <Input
                  id="srv-port"
                  name="port"
                  type="number"
                  inputMode="numeric"
                  defaultValue={state.values?.port ?? "22"}
                />
                <FieldError errors={errs("port")} />
              </Field>
            </div>
            <Field data-invalid={!!state.fieldErrors?.username || undefined}>
              <FieldLabel htmlFor="srv-user">{t("add.username")}</FieldLabel>
              <Input
                id="srv-user"
                name="username"
                placeholder="root"
                defaultValue={state.values?.username}
                required
              />
              <FieldError errors={errs("username")} />
            </Field>
            <Field data-invalid={!!state.fieldErrors?.privateKey || undefined}>
              <FieldLabel htmlFor="srv-key">{t("add.privateKey")}</FieldLabel>
              <Textarea
                id="srv-key"
                name="privateKey"
                rows={4}
                className="font-mono text-xs"
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                autoComplete="off"
              />
              <FieldDescription>
                {t("add.privateKeyHint")}
              </FieldDescription>
              <FieldError errors={errs("privateKey")} />
            </Field>
            {state.error && (
              <FieldDescription className="text-destructive" role="alert">
                {state.error}
              </FieldDescription>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? t("add.saving") : t("add.save")}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
