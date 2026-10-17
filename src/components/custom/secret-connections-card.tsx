"use client"

import { Plug, Plus, Trash2, Vault } from "lucide-react"
import { useTranslations } from "next-intl"
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
  createSecretConnectionAction,
  deleteSecretConnectionAction,
  testSecretConnectionAction,
  type SecretConnectionFormState,
} from "@/features/secret-connection/secret-connection.actions"
import type {
  SecretConnection,
  SecretConnectionTestResult,
} from "@/features/secret-connection/secret-connection.entity"

/**
 * Settings card (owner/admin): connections to a secret manager (Infisical)
 * that applications can pull secrets from. The client secret is write-only —
 * it is stored encrypted and never shown again.
 */
export function SecretConnectionsCard({
  connections,
}: {
  connections: SecretConnection[]
}) {
  const t = useTranslations("settings")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tests, setTests] = useState<
    Record<string, SecretConnectionTestResult>
  >({})

  const test = (id: string) =>
    start(async () => {
      setError(null)
      const r = await testSecretConnectionAction(id)
      if (r.ok) setTests((prev) => ({ ...prev, [id]: r.data }))
      else setError(r.error)
    })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{t("secretConnections.title")}</CardTitle>
            <CardDescription>
              {t("secretConnections.description")}
            </CardDescription>
          </div>
          <AddConnectionDialog />
        </div>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-md border">
          {connections.map((c) => {
            const result = tests[c.id]
            return (
              <li key={c.id} className="space-y-1 px-3 py-2 text-xs">
                <div className="flex items-center gap-3">
                  <Vault className="size-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{c.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {c.url || t("secretConnections.cloud")} · {c.clientId}
                  </span>
                  <span className="ms-auto" />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("secretConnections.testAria", {
                      name: c.name,
                    })}
                    disabled={pending}
                    onClick={() => test(c.id)}
                  >
                    <Plug />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("secretConnections.deleteAria", {
                      name: c.name,
                    })}
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        setError(null)
                        const r = await deleteSecretConnectionAction(c.id)
                        if (!r.ok) setError(r.error)
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
                {result && (
                  <p
                    className={
                      result.ok
                        ? "text-xs text-foreground"
                        : "text-xs text-destructive"
                    }
                  >
                    {result.message}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
        {error && (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

const initialState: SecretConnectionFormState = {}

/** `size`: "sm" in a card header, "default" as the action of an empty state. */
export function AddConnectionDialog({
  size = "sm",
}: {
  size?: "sm" | "default"
}) {
  const t = useTranslations("settings")
  const c = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(
    async (prev: SecretConnectionFormState, formData: FormData) => {
      const next = await createSecretConnectionAction(prev, formData)
      if (next.created) setOpen(false)
      return next
    },
    initialState
  )
  const errs = (
    k: keyof NonNullable<SecretConnectionFormState["fieldErrors"]>
  ) => state.fieldErrors?.[k]?.map((message) => ({ message }))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size}>
          <Plus data-icon="inline-start" />
          {c("actions.add")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("secretConnections.dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("secretConnections.dialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <form action={action} noValidate>
          <FieldGroup>
            <Field data-invalid={!!state.fieldErrors?.name || undefined}>
              <FieldLabel htmlFor="sc-name">{c("labels.name")}</FieldLabel>
              <Input
                id="sc-name"
                name="name"
                defaultValue={state.values?.name}
                required
              />
              <FieldError errors={errs("name")} />
            </Field>
            <Field data-invalid={!!state.fieldErrors?.url || undefined}>
              <FieldLabel htmlFor="sc-url">
                {t("secretConnections.urlOptional")}
              </FieldLabel>
              <Input
                id="sc-url"
                name="url"
                placeholder="https://infisical.example.com"
                defaultValue={state.values?.url}
              />
              <FieldDescription>
                {t("secretConnections.urlHelp")}
              </FieldDescription>
              <FieldError errors={errs("url")} />
            </Field>
            <Field data-invalid={!!state.fieldErrors?.clientId || undefined}>
              <FieldLabel htmlFor="sc-client-id">
                {t("secretConnections.clientId")}
              </FieldLabel>
              <Input
                id="sc-client-id"
                name="clientId"
                autoComplete="off"
                defaultValue={state.values?.clientId}
                required
              />
              <FieldError errors={errs("clientId")} />
            </Field>
            <Field
              data-invalid={!!state.fieldErrors?.clientSecret || undefined}
            >
              <FieldLabel htmlFor="sc-client-secret">
                {t("secretConnections.clientSecret")}
              </FieldLabel>
              <Input
                id="sc-client-secret"
                name="clientSecret"
                type="password"
                autoComplete="off"
                required
              />
              <FieldDescription>
                {t("secretConnections.secretHelp")}
              </FieldDescription>
              <FieldError errors={errs("clientSecret")} />
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
