"use client"

import type { ReactNode } from "react"
import { PathArrow } from "@/components/custom/arrows"
import { Bell, BellRing, Plus, Send, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useActionState, useState, useTransition } from "react"
import { EmptyState } from "@/components/custom/empty-state"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  createNotificationAction,
  deleteNotificationAction,
  testNotificationAction,
  type NotificationFormState,
} from "@/features/notification/notification.actions"
import type {
  Notification,
  NotificationTestResult,
  NotificationType,
} from "@/features/notification/notification.entity"

const TYPE_LABEL: Record<NotificationType, string> = {
  telegram: "Telegram",
  slack: "Slack",
  discord: "Discord",
  webhook: "Webhook",
  email: "Email (SMTP)",
}

/** Event toggles; the label of each is `notifications.events.<name>`. */
const EVENTS: Array<keyof Notification & `on${string}`> = [
  "onDeploymentStarted",
  "onDeploymentSuccess",
  "onDeploymentFailure",
  "onBackupFailure",
  "onJobFailure",
  "onDiskLow",
  "onCertificateFailure",
  "onDnsIssue",
  "onContainerDown",
  "onAppError",
  "onServerDown",
  "onHttpDown",
  "onResourceAlert",
]

/** `onDeploymentStarted` and `onAppError` default off (API default too) —
 * the first fires once per deploy/redeploy and would be noisy for channels
 * that just want outcomes, the second is a log-text guess prone to false
 * positives. */
const DEFAULT_OFF_EVENTS = new Set<keyof Notification & `on${string}`>([
  "onDeploymentStarted",
  "onAppError",
])
const DEFAULT_CHECKED_EVENTS = new Set<keyof Notification & `on${string}`>(
  EVENTS.filter((name) => !DEFAULT_OFF_EVENTS.has(name))
)

/** Settings card: channels that receive deployment success/failure messages. */
export function NotificationsCard({
  notifications,
}: {
  notifications: Notification[]
}) {
  const t = useTranslations("settings")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tests, setTests] = useState<Record<string, NotificationTestResult>>({})

  const test = (id: string) =>
    start(async () => {
      setError(null)
      const r = await testNotificationAction(id)
      if (r.ok) setTests((prev) => ({ ...prev, [id]: r.data }))
      else setError(r.error)
    })

  const remove = (id: string) =>
    start(async () => {
      setError(null)
      const r = await deleteNotificationAction(id)
      if (!r.ok) setError(r.error)
    })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{t("notifications.title")}</CardTitle>
            <CardDescription>{t("notifications.description")}</CardDescription>
          </div>
          <AddNotificationDialog />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {notifications.length === 0 ? (
          <EmptyState icon={Bell} compact>
            {t("notifications.empty")}
          </EmptyState>
        ) : (
          <ul className="divide-y rounded-md border">
            {notifications.map((n) => {
              const result = tests[n.id]
              const events = EVENTS.filter((k) => n[k]).map((k) =>
                t(`notifications.events.${k}`)
              )
              return (
                <li key={n.id} className="space-y-1 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <BellRing className="size-4 text-muted-foreground" />
                    <span className="font-medium">{n.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {TYPE_LABEL[n.type]} · {n.targetHint} ·{" "}
                      {events.length
                        ? events.join(", ")
                        : t("notifications.none")}
                    </span>
                    <span className="ms-auto" />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("notifications.testAria", { name: n.name })}
                      disabled={pending}
                      onClick={() => test(n.id)}
                    >
                      <Send />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("notifications.deleteAria", {
                        name: n.name,
                      })}
                      disabled={pending}
                      onClick={() => remove(n.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  {result && (
                    <p
                      className={`text-xs ${result.ok ? "text-foreground" : "text-destructive"}`}
                    >
                      {result.message}
                    </p>
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

const initialState: NotificationFormState = {}

function AddNotificationDialog() {
  const t = useTranslations("settings")
  const c = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<NotificationType>("telegram")
  const hint: ReactNode = t.rich(`notifications.hints.${type}`, {
    arrow: () => <PathArrow />,
  })
  const [state, action, pending] = useActionState(
    async (prev: NotificationFormState, formData: FormData) => {
      const next = await createNotificationAction(prev, formData)
      if (next.created) setOpen(false)
      return next
    },
    initialState
  )
  const errs = (k: keyof NonNullable<NotificationFormState["fieldErrors"]>) =>
    state.fieldErrors?.[k]?.map((message) => ({ message }))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus data-icon="inline-start" />
          {c("actions.add")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("notifications.dialog.title")}</DialogTitle>
          <DialogDescription>{hint}</DialogDescription>
        </DialogHeader>
        <form action={action} noValidate>
          <FieldGroup>
            <Field data-invalid={!!state.fieldErrors?.name || undefined}>
              <FieldLabel htmlFor="ntf-name">{c("labels.name")}</FieldLabel>
              <Input
                id="ntf-name"
                name="name"
                defaultValue={state.values?.name}
                required
              />
              <FieldError errors={errs("name")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="ntf-type">{c("labels.type")}</FieldLabel>
              <Select
                name="type"
                value={type}
                onValueChange={(v) => setType(v as NotificationType)}
              >
                <SelectTrigger id="ntf-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {(Object.keys(TYPE_LABEL) as NotificationType[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {TYPE_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {type === "telegram" && (
              <>
                <Field
                  data-invalid={!!state.fieldErrors?.botToken || undefined}
                >
                  <FieldLabel htmlFor="ntf-token">
                    {t("notifications.dialog.botToken")}
                  </FieldLabel>
                  <Input
                    id="ntf-token"
                    name="botToken"
                    type="password"
                    autoComplete="off"
                    placeholder="123456789:AAH…"
                    required
                  />
                  <FieldError errors={errs("botToken")} />
                </Field>
                <Field data-invalid={!!state.fieldErrors?.chatId || undefined}>
                  <FieldLabel htmlFor="ntf-chat">
                    {t("notifications.dialog.chatId")}
                  </FieldLabel>
                  <Input
                    id="ntf-chat"
                    name="chatId"
                    placeholder="-1001234567890"
                    defaultValue={state.values?.chatId}
                    required
                  />
                  <FieldError errors={errs("chatId")} />
                </Field>
              </>
            )}
            {(type === "slack" || type === "discord") && (
              <Field
                data-invalid={!!state.fieldErrors?.webhookUrl || undefined}
              >
                <FieldLabel htmlFor="ntf-webhook">
                  {t("notifications.dialog.webhookUrl")}
                </FieldLabel>
                <Input
                  id="ntf-webhook"
                  name="webhookUrl"
                  type="password"
                  autoComplete="off"
                  placeholder="https://…"
                  required
                />
                <FieldError errors={errs("webhookUrl")} />
              </Field>
            )}
            {type === "webhook" && (
              <Field data-invalid={!!state.fieldErrors?.url || undefined}>
                <FieldLabel htmlFor="ntf-url">{c("labels.url")}</FieldLabel>
                <Input
                  id="ntf-url"
                  name="url"
                  placeholder="https://example.com/hooks/aoox"
                  defaultValue={state.values?.url}
                  required
                />
                <FieldError errors={errs("url")} />
              </Field>
            )}
            {type === "webhook" && (
              <Field>
                <FieldLabel htmlFor="ntf-secret">
                  {t("notifications.dialog.secretOptional")}
                </FieldLabel>
                <Input
                  id="ntf-secret"
                  name="secret"
                  type="password"
                  autoComplete="off"
                  defaultValue={state.values?.secret}
                />
                <FieldDescription>
                  {t.rich("notifications.dialog.secretHelp", {
                    code: (chunks) => <code>{chunks}</code>,
                  })}
                </FieldDescription>
              </Field>
            )}
            {type === "email" && (
              <>
                <div className="grid grid-cols-[1fr_6rem] gap-3">
                  <Field
                    data-invalid={!!state.fieldErrors?.smtpHost || undefined}
                  >
                    <FieldLabel htmlFor="ntf-smtp-host">
                      {t("notifications.dialog.smtpHost")}
                    </FieldLabel>
                    <Input
                      id="ntf-smtp-host"
                      name="smtpHost"
                      placeholder="smtp.example.com"
                      defaultValue={state.values?.smtpHost}
                      required
                    />
                    <FieldError errors={errs("smtpHost")} />
                  </Field>
                  <Field
                    data-invalid={!!state.fieldErrors?.smtpPort || undefined}
                  >
                    <FieldLabel htmlFor="ntf-smtp-port">
                      {c("labels.port")}
                    </FieldLabel>
                    <Input
                      id="ntf-smtp-port"
                      name="smtpPort"
                      type="number"
                      inputMode="numeric"
                      defaultValue={state.values?.smtpPort ?? "587"}
                    />
                    <FieldError errors={errs("smtpPort")} />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <Switch name="smtpSecure" />
                  {t("notifications.dialog.implicitTls")}
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="ntf-smtp-user">Username</FieldLabel>
                    <Input
                      id="ntf-smtp-user"
                      name="smtpUsername"
                      autoComplete="off"
                      defaultValue={state.values?.smtpUsername}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ntf-smtp-pass">
                      {c("labels.password")}
                    </FieldLabel>
                    <Input
                      id="ntf-smtp-pass"
                      name="smtpPassword"
                      type="password"
                      autoComplete="off"
                    />
                  </Field>
                </div>
                <Field data-invalid={!!state.fieldErrors?.from || undefined}>
                  <FieldLabel htmlFor="ntf-from">
                    {t("notifications.dialog.sender")}
                  </FieldLabel>
                  <Input
                    id="ntf-from"
                    name="from"
                    type="email"
                    placeholder="aoox@example.com"
                    defaultValue={state.values?.from}
                    required
                  />
                  <FieldError errors={errs("from")} />
                </Field>
                <Field data-invalid={!!state.fieldErrors?.to || undefined}>
                  <FieldLabel htmlFor="ntf-to">
                    {t("notifications.dialog.recipient")}
                  </FieldLabel>
                  <Input
                    id="ntf-to"
                    name="to"
                    placeholder="ops@example.com, dev@example.com"
                    defaultValue={state.values?.to}
                    required
                  />
                  <FieldDescription>
                    {t("notifications.dialog.recipientHelp")}
                  </FieldDescription>
                  <FieldError errors={errs("to")} />
                </Field>
              </>
            )}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {EVENTS.map((name) => (
                <label
                  key={name}
                  className="flex items-center gap-2 text-xs capitalize"
                >
                  <Switch
                    name={name}
                    defaultChecked={DEFAULT_CHECKED_EVENTS.has(name)}
                  />
                  {t(`notifications.events.${name}`)}
                </label>
              ))}
            </div>
            <FieldDescription>
              {t("notifications.dialog.secretsNote")}
            </FieldDescription>
            {state.error && (
              <FieldDescription className="text-destructive" role="alert">
                {state.error}
              </FieldDescription>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? c("states.saving") : c("actions.save")}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
