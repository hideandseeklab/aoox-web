"use client"

import { BellRing, Plus, Send, Trash2 } from "lucide-react"
import { useActionState, useState, useTransition } from "react"
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

const EVENT_LABEL: Array<[keyof Notification & `on${string}`, string]> = [
  ["onDeploymentSuccess", "deploy sukses"],
  ["onDeploymentFailure", "deploy gagal"],
  ["onBackupFailure", "backup gagal"],
  ["onJobFailure", "job gagal"],
  ["onDiskLow", "disk hampir penuh"],
  ["onCertificateFailure", "sertifikat gagal"],
  ["onDnsIssue", "DNS domain bermasalah"],
  ["onContainerDown", "container mati"],
]

/** Settings card: channels that receive deployment success/failure messages. */
export function NotificationsCard({
  notifications,
}: {
  notifications: Notification[]
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tests, setTests] = useState<Record<string, NotificationTestResult>>({})

  const test = (id: string) =>
    start(async () => {
      setError(null)
      const r = await testNotificationAction(id)
      if (r.ok) setTests((t) => ({ ...t, [id]: r.data }))
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
            <CardTitle>Notifikasi</CardTitle>
            <CardDescription>
              Deploy sukses/gagal, backup gagal, dan container mati ke Telegram,
              Slack, Discord, email, atau webhook. Token disimpan terenkripsi.
            </CardDescription>
          </div>
          <AddNotificationDialog />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {notifications.length === 0 ? (
          <p className="text-muted-foreground">Belum ada channel.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {notifications.map((n) => {
              const result = tests[n.id]
              const events = EVENT_LABEL.filter(([k]) => n[k]).map(
                ([, label]) => label
              )
              return (
                <li key={n.id} className="space-y-1 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <BellRing className="size-4 text-muted-foreground" />
                    <span className="font-medium">{n.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {TYPE_LABEL[n.type]} · {n.targetHint} ·{" "}
                      {events.length ? events.join(", ") : "nonaktif"}
                    </span>
                    <span className="ms-auto" />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Kirim tes ke ${n.name}`}
                      disabled={pending}
                      onClick={() => test(n.id)}
                    >
                      <Send />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Hapus ${n.name}`}
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

const HINT: Record<NotificationType, string> = {
  telegram:
    "Buat bot lewat @BotFather, tambahkan ke grup/chat, lalu isi token dan chat ID (grup biasanya negatif).",
  slack:
    "Incoming Webhook dari Slack app (https://hooks.slack.com/services/…).",
  discord: "Server Settings → Integrations → Webhooks → Copy Webhook URL.",
  webhook:
    "Endpoint kamu sendiri; menerima POST JSON (title, level, event, …).",
  email:
    "Server SMTP kamu (mis. Gmail app password, Mailgun, SES). Port 465 = TLS implisit; 587 = STARTTLS.",
}

function AddNotificationDialog() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<NotificationType>("telegram")
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
          Tambah
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Channel notifikasi baru</DialogTitle>
          <DialogDescription>{HINT[type]}</DialogDescription>
        </DialogHeader>
        <form action={action} noValidate>
          <FieldGroup>
            <Field data-invalid={!!state.fieldErrors?.name || undefined}>
              <FieldLabel htmlFor="ntf-name">Nama</FieldLabel>
              <Input
                id="ntf-name"
                name="name"
                defaultValue={state.values?.name}
                required
              />
              <FieldError errors={errs("name")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="ntf-type">Tipe</FieldLabel>
              <Select
                name="type"
                value={type}
                onValueChange={(v) => setType(v as NotificationType)}
              >
                <SelectTrigger id="ntf-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABEL) as NotificationType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABEL[t]}
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
                  <FieldLabel htmlFor="ntf-token">Bot token</FieldLabel>
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
                  <FieldLabel htmlFor="ntf-chat">Chat ID</FieldLabel>
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
                <FieldLabel htmlFor="ntf-webhook">Webhook URL</FieldLabel>
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
                <FieldLabel htmlFor="ntf-url">URL</FieldLabel>
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
                <FieldLabel htmlFor="ntf-secret">Secret (opsional)</FieldLabel>
                <Input
                  id="ntf-secret"
                  name="secret"
                  type="password"
                  autoComplete="off"
                  defaultValue={state.values?.secret}
                />
                <FieldDescription>
                  Bila diisi, tiap kiriman membawa{" "}
                  <code>X-Aoox-Signature: sha256=HMAC(secret, body)</code>{" "}
                  (plus <code>X-Aoox-Event</code> dan{" "}
                  <code>X-Aoox-Delivery</code>) — verifikasi seperti
                  webhook GitHub.
                </FieldDescription>
              </Field>
            )}
            {type === "email" && (
              <>
                <div className="grid grid-cols-[1fr_6rem] gap-3">
                  <Field
                    data-invalid={!!state.fieldErrors?.smtpHost || undefined}
                  >
                    <FieldLabel htmlFor="ntf-smtp-host">Host SMTP</FieldLabel>
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
                    <FieldLabel htmlFor="ntf-smtp-port">Port</FieldLabel>
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
                <label className="flex items-center gap-2 text-sm">
                  <Switch name="smtpSecure" />
                  TLS implisit (port 465)
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
                    <FieldLabel htmlFor="ntf-smtp-pass">Password</FieldLabel>
                    <Input
                      id="ntf-smtp-pass"
                      name="smtpPassword"
                      type="password"
                      autoComplete="off"
                    />
                  </Field>
                </div>
                <Field data-invalid={!!state.fieldErrors?.from || undefined}>
                  <FieldLabel htmlFor="ntf-from">Pengirim</FieldLabel>
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
                  <FieldLabel htmlFor="ntf-to">Penerima</FieldLabel>
                  <Input
                    id="ntf-to"
                    name="to"
                    placeholder="ops@example.com, dev@example.com"
                    defaultValue={state.values?.to}
                    required
                  />
                  <FieldDescription>Pisahkan dengan koma.</FieldDescription>
                  <FieldError errors={errs("to")} />
                </Field>
              </>
            )}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {EVENT_LABEL.map(([name, label]) => (
                <label
                  key={name}
                  className="flex items-center gap-2 text-sm capitalize"
                >
                  <Switch name={name} defaultChecked />
                  {label}
                </label>
              ))}
            </div>
            <FieldDescription>
              Token/URL tidak bisa dilihat lagi setelah disimpan.
            </FieldDescription>
            {state.error && (
              <FieldDescription className="text-destructive" role="alert">
                {state.error}
              </FieldDescription>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Menyimpan…" : "Simpan"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
