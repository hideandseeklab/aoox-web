"use client"

import { Copy, Plug, Plus, ServerIcon, Trash2 } from "lucide-react"
import { useActionState, useState, useTransition } from "react"
import { ServerProxyPanel } from "@/components/custom/server-proxy-panel"
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
            <CardTitle>Server remote</CardTitle>
            <CardDescription>
              VPS lain yang bisa dibuka dari halaman Terminal lewat SSH. Secara
              default memakai key milik aoox di bawah.
            </CardDescription>
          </div>
          <AddServerDialog />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-1.5">
          <p className="text-muted-foreground">
            Jalankan sekali di setiap server, sebagai user yang akan dipakai:
          </p>
          {platformKey.authorizeCommand ? (
            <CommandBox label="perintah" value={platformKey.authorizeCommand} />
          ) : (
            <p className="text-destructive" role="alert">
              {platformKey.error ?? "Key platform belum tersedia."}
            </p>
          )}
        </div>

        {servers.length === 0 ? (
          <p className="text-muted-foreground">Belum ada server remote.</p>
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
                      {s.hasOwnKey ? " · key sendiri" : ""}
                    </span>
                    <span className="ms-auto" />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Tes koneksi ${s.name}`}
                      disabled={pending}
                      onClick={() => test(s.id)}
                    >
                      <Plug />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Hapus ${s.name}`}
                      disabled={pending}
                      onClick={() => remove(s.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
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
                          label="perintah"
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
  return (
    <div className="flex items-start gap-2">
      <pre className="min-w-0 flex-1 overflow-x-auto rounded bg-muted px-2 py-1.5 font-mono text-xs break-all whitespace-pre-wrap">
        {value}
      </pre>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Salin ${label}`}
        onClick={() => void navigator.clipboard.writeText(value)}
      >
        <Copy />
      </Button>
    </div>
  )
}

const initialState: ServerFormState = {}

function AddServerDialog() {
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
          Tambah
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Server remote baru</DialogTitle>
          <DialogDescription>
            Server harus bisa dijangkau lewat SSH dari mesin aoox.
          </DialogDescription>
        </DialogHeader>
        <form action={action} noValidate>
          <FieldGroup>
            <Field data-invalid={!!state.fieldErrors?.name || undefined}>
              <FieldLabel htmlFor="srv-name">Nama</FieldLabel>
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
                <FieldLabel htmlFor="srv-host">Host</FieldLabel>
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
                <FieldLabel htmlFor="srv-port">Port</FieldLabel>
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
              <FieldLabel htmlFor="srv-user">Username</FieldLabel>
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
              <FieldLabel htmlFor="srv-key">Private key (opsional)</FieldLabel>
              <Textarea
                id="srv-key"
                name="privateKey"
                rows={4}
                className="font-mono text-xs"
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                autoComplete="off"
              />
              <FieldDescription>
                Kosongkan untuk memakai key aoox (tinggal jalankan
                perintah di kartu ini pada server). Key tanpa passphrase.
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
                {pending ? "Menyimpan…" : "Simpan"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
