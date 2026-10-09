"use client"

import { PathArrow } from "@/components/custom/arrows"
import { KeyRound, Plus, Trash2 } from "lucide-react"
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
import {
  createGitCredentialAction,
  deleteGitCredentialAction,
  type GitCredentialFormState,
} from "@/features/git-credential/git-credential.actions"
import type { GitCredential } from "@/features/git-credential/git-credential.entity"

/** Brand names; "generic" is translated at render time. */
const PROVIDER_LABEL: Record<"github" | "gitlab", string> = {
  github: "GitHub",
  gitlab: "GitLab",
}

export function GitCredentialsCard({
  credentials,
  canManage,
}: {
  credentials: GitCredential[]
  canManage: boolean
}) {
  const t = useTranslations("settings")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{t("gitCredentials.title")}</CardTitle>
            <CardDescription>{t("gitCredentials.description")}</CardDescription>
          </div>
          {canManage && <AddCredentialDialog />}
        </div>
      </CardHeader>
      <CardContent>
        {credentials.length === 0 ? (
          <EmptyState icon={KeyRound} compact>
            {t("gitCredentials.empty")}
          </EmptyState>
        ) : (
          <ul className="divide-y rounded-md border">
            {credentials.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 px-3 py-2 text-xs"
              >
                <KeyRound className="size-4 text-muted-foreground" />
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">
                  {c.provider === "generic"
                    ? t("gitCredentials.generic")
                    : PROVIDER_LABEL[c.provider]}{" "}
                  · {c.username}
                </span>
                <span className="ms-auto" />
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("gitCredentials.deleteAria", {
                      name: c.name,
                    })}
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
          <p className="mt-2 text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

const initialState: GitCredentialFormState = {}

function AddCredentialDialog() {
  const t = useTranslations("settings")
  const c = useTranslations("common")
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

  const hint = t.rich(`gitCredentials.hints.${provider}`, {
    arrow: () => <PathArrow />,
  })

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
          <DialogTitle>{t("gitCredentials.dialogTitle")}</DialogTitle>
          <DialogDescription>{hint}</DialogDescription>
        </DialogHeader>
        <form action={action} noValidate>
          <FieldGroup>
            <Field data-invalid={!!state.fieldErrors?.name || undefined}>
              <FieldLabel htmlFor="cred-name">{c("labels.name")}</FieldLabel>
              <Input
                id="cred-name"
                name="name"
                defaultValue={state.values?.name}
                required
              />
              <FieldError errors={errs("name")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="cred-provider">
                {t("gitCredentials.provider")}
              </FieldLabel>
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
                  <SelectItem value="generic">
                    {t("gitCredentials.generic")}
                  </SelectItem>
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
                {t("gitCredentials.tokenHelp")}
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
                {pending ? c("states.saving") : c("actions.save")}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
