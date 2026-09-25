"use client"

import { Plus, Trash2 } from "lucide-react"
import { useActionState, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createExternalRegistryAction,
  deleteRegistryAction,
  testRegistryAction,
  type ExternalRegistryFormState,
} from "@/features/registry/registry.actions"
import type { Registry } from "@/features/registry/registry.entity"

export function ExternalRegistries({
  registries,
  canManage,
}: {
  registries: Registry[]
  canManage: boolean
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Docker Hub, GHCR, GitLab, atau registry lain. Kredensial disimpan
          terenkripsi.
        </p>
        {canManage && <AddExternalRegistryDialog />}
      </div>
      {registries.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Belum ada registry eksternal.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead className="w-44" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {registries.map((r) => (
                <ExternalRegistryRow
                  key={r.id}
                  registry={r}
                  canManage={canManage}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function ExternalRegistryRow({
  registry,
  canManage,
}: {
  registry: Registry
  canManage: boolean
}) {
  const [pending, start] = useTransition()
  const [result, setResult] = useState<string | null>(null)

  return (
    <TableRow>
      <TableCell className="font-medium">{registry.name}</TableCell>
      <TableCell className="font-mono text-xs">{registry.url}</TableCell>
      <TableCell className="font-mono text-xs">
        {registry.username ?? "—"}
      </TableCell>
      <TableCell className="font-mono text-xs">
        {registry.imagePrefix ?? "—"}
      </TableCell>
      <TableCell>
        {canManage && (
          <div className="flex items-center justify-end gap-1">
            {result && (
              <span className="me-2 max-w-48 truncate text-xs text-muted-foreground">
                {result}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await testRegistryAction(registry.id)
                  setResult(r.ok ? r.data.message : r.error)
                })
              }
            >
              Test
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Hapus ${registry.name}`}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await deleteRegistryAction(registry.id)
                  if (!r.ok) setResult(r.error)
                })
              }
            >
              <Trash2 />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  )
}

const initialState: ExternalRegistryFormState = {}

function AddExternalRegistryDialog() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(
    async (prev: ExternalRegistryFormState, formData: FormData) => {
      const next = await createExternalRegistryAction(prev, formData)
      // Close on success from inside the action rather than an effect.
      if (next.created) setOpen(false)
      return next
    },
    initialState
  )

  const errs = (
    k: keyof NonNullable<ExternalRegistryFormState["fieldErrors"]>
  ) => state.fieldErrors?.[k]?.map((message) => ({ message }))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus data-icon="inline-start" />
          Tambah registry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registry eksternal</DialogTitle>
          <DialogDescription>
            Untuk Docker Hub isi URL <code>docker.io</code>; GHCR{" "}
            <code>ghcr.io</code>; GitLab <code>registry.gitlab.com</code>.
          </DialogDescription>
        </DialogHeader>
        <form action={action} noValidate>
          <FieldGroup>
            <Field data-invalid={!!state.fieldErrors?.name || undefined}>
              <FieldLabel htmlFor="reg-name">Nama</FieldLabel>
              <Input
                id="reg-name"
                name="name"
                defaultValue={state.values?.name}
                required
              />
              <FieldError errors={errs("name")} />
            </Field>
            <Field data-invalid={!!state.fieldErrors?.url || undefined}>
              <FieldLabel htmlFor="reg-url">URL</FieldLabel>
              <Input
                id="reg-url"
                name="url"
                placeholder="ghcr.io"
                defaultValue={state.values?.url}
                required
              />
              <FieldError errors={errs("url")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="reg-user">Username</FieldLabel>
              <Input
                id="reg-user"
                name="username"
                defaultValue={state.values?.username}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="reg-pass">Password / token</FieldLabel>
              <Input
                id="reg-pass"
                name="password"
                type="password"
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="reg-prefix">Image prefix</FieldLabel>
              <Input
                id="reg-prefix"
                name="imagePrefix"
                placeholder="myorg"
                defaultValue={state.values?.imagePrefix}
              />
              <FieldDescription>
                Opsional; image akan di-push sebagai{" "}
                <code>&lt;url&gt;/&lt;prefix&gt;/&lt;app&gt;</code>.
              </FieldDescription>
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
