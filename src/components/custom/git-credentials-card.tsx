"use client"

import { KeyRound, Plus, Trash2 } from "lucide-react"
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
import {
  createGitCredentialAction,
  deleteGitCredentialAction,
  type GitCredentialFormState,
} from "@/features/git-credential/git-credential.actions"
import type { GitCredential } from "@/features/git-credential/git-credential.entity"

const PROVIDER_LABEL: Record<GitCredential["provider"], string> = {
  github: "GitHub",
  gitlab: "GitLab",
  generic: "Generik (HTTPS)",
}

export function GitCredentialsCard({
  credentials,
  canManage,
}: {
  credentials: GitCredential[]
  canManage: boolean
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Kredensial Git</CardTitle>
            <CardDescription>
              Token HTTPS untuk repo privat. Disimpan terenkripsi dan hanya
              dipakai saat Docker meng-clone repo.
            </CardDescription>
          </div>
          {canManage && <AddCredentialDialog />}
        </div>
      </CardHeader>
      <CardContent>
        {credentials.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada kredensial — semua repo di-clone secara anonim.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {credentials.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 px-3 py-2 text-sm"
              >
                <KeyRound className="size-4 text-muted-foreground" />
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">
                  {PROVIDER_LABEL[c.provider]} · {c.username}
                </span>
                <span className="ms-auto" />
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Hapus ${c.name}`}
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await deleteGitCredentialAction(c.id)
                        if (!r.ok) setError(r.error)
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

const initialState: GitCredentialFormState = {}

function AddCredentialDialog() {
  const [open, setOpen] = useState(false)
  const [provider, setProvider] = useState<GitCredential["provider"]>("github")
  const [state, action, pending] = useActionState(
    async (prev: GitCredentialFormState, formData: FormData) => {
      const next = await createGitCredentialAction(prev, formData)
      if (next.created) setOpen(false)
      return next
    },
    initialState
  )
  const errs = (k: keyof NonNullable<GitCredentialFormState["fieldErrors"]>) =>
    state.fieldErrors?.[k]?.map((message) => ({ message }))

  const hint =
    provider === "github"
      ? "Personal access token (classic: scope repo; fine-grained: Contents read). Username bebas, mis. x-access-token."
      : provider === "gitlab"
        ? "Deploy token (Settings → Repository → Deploy tokens, scope read_repository) — isi username token-nya."
        : "Username + password/token HTTPS dari server git kamu."

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
          <DialogTitle>Kredensial Git baru</DialogTitle>
          <DialogDescription>{hint}</DialogDescription>
        </DialogHeader>
        <form action={action} noValidate>
          <FieldGroup>
            <Field data-invalid={!!state.fieldErrors?.name || undefined}>
              <FieldLabel htmlFor="cred-name">Nama</FieldLabel>
              <Input
                id="cred-name"
                name="name"
                defaultValue={state.values?.name}
                required
              />
              <FieldError errors={errs("name")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="cred-provider">Provider</FieldLabel>
              <Select
                name="provider"
                value={provider}
                onValueChange={(v) =>
                  setProvider(v as GitCredential["provider"])
                }
              >
                <SelectTrigger id="cred-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="github">GitHub</SelectItem>
                  <SelectItem value="gitlab">GitLab</SelectItem>
                  <SelectItem value="generic">Generik (HTTPS)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field data-invalid={!!state.fieldErrors?.username || undefined}>
              <FieldLabel htmlFor="cred-user">Username</FieldLabel>
              <Input
                id="cred-user"
                name="username"
                placeholder={provider === "github" ? "x-access-token" : ""}
                defaultValue={state.values?.username}
                required
              />
              <FieldError errors={errs("username")} />
            </Field>
            <Field data-invalid={!!state.fieldErrors?.token || undefined}>
              <FieldLabel htmlFor="cred-token">Token</FieldLabel>
              <Input
                id="cred-token"
                name="token"
                type="password"
                autoComplete="off"
                required
              />
              <FieldDescription>
                Tidak bisa dilihat lagi setelah disimpan.
              </FieldDescription>
              <FieldError errors={errs("token")} />
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
