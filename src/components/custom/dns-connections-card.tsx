"use client"

import { Cloud, Plus, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useActionState, useState, useTransition } from "react"
import { TestButton, TestResult } from "@/components/custom/test-result"
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
  createDnsConnectionAction,
  deleteDnsConnectionAction,
  testDnsConnectionAction,
  type DnsConnectionFormState,
} from "@/features/dns/dns.actions"
import type {
  DnsConnection,
  DnsConnectionTestResult,
} from "@/features/dns/dns.entity"

/**
 * Settings card (owner/admin): Cloudflare API tokens used to create DNS records for
 * domains and to answer ACME DNS-01 challenges. The token is write-only: stored
 * encrypted, never shown again.
 */
export function DnsConnectionsCard({
  connections,
}: {
  connections: DnsConnection[]
}) {
  const t = useTranslations("dns")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tests, setTests] = useState<Record<string, DnsConnectionTestResult>>(
    {}
  )

  const [testingId, setTestingId] = useState<string | null>(null)

  const test = (id: string) => {
    // Set outside the transition: updates made inside one only commit when it ends.
    setTestingId(id)
    start(async () => {
      setError(null)
      const r = await testDnsConnectionAction(id)
      setTestingId(null)
      if (r.ok) setTests((prev) => ({ ...prev, [id]: r.data }))
      else setError(r.error)
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{t("connections.title")}</CardTitle>
            <CardDescription>{t("connections.description")}</CardDescription>
          </div>
          <AddConnectionDialog />
        </div>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-md border">
          {connections.map((conn) => {
            const result = tests[conn.id]
            const noZones = result?.ok && result.zones.length === 0
            return (
              <li key={conn.id} className="space-y-1.5 px-3 py-2 text-xs">
                <div className="flex items-center gap-3">
                  <Cloud className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 truncate font-medium">
                    {conn.name}
                  </span>
                  <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                    Cloudflare
                    {conn.accountId ? ` · ${conn.accountId.slice(0, 8)}…` : ""}
                  </span>
                  <span className="ms-auto" />
                  <TestButton
                    ariaLabel={t("connections.testAria", { name: conn.name })}
                    testing={testingId === conn.id}
                    disabled={pending}
                    onClick={() => test(conn.id)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("connections.deleteAria", {
                      name: conn.name,
                    })}
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        setError(null)
                        const r = await deleteDnsConnectionAction(conn.id)
                        if (!r.ok) setError(r.error)
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
                {result && (
                  <TestResult
                    status={
                      !result.ok ? "failure" : noZones ? "warning" : "success"
                    }
                    detail={
                      result.ok && result.zones.length > 0 ? (
                        <span className="font-mono">
                          {result.zones.join(", ")}
                        </span>
                      ) : undefined
                    }
                  >
                    {!result.ok
                      ? result.message
                      : noZones
                        ? t("connections.testNoZones")
                        : t("connections.testOk", {
                            count: result.zones.length,
                          })}
                  </TestResult>
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

const initialState: DnsConnectionFormState = {}

/** `size`: "sm" in a card header, "default" as the action of an empty state. */
export function AddConnectionDialog({
  size = "sm",
}: {
  size?: "sm" | "default"
}) {
  const t = useTranslations("dns")
  const c = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(
    async (prev: DnsConnectionFormState, formData: FormData) => {
      const next = await createDnsConnectionAction(prev, formData)
      if (next.created) setOpen(false)
      return next
    },
    initialState
  )
  const errs = (k: keyof NonNullable<DnsConnectionFormState["fieldErrors"]>) =>
    state.fieldErrors?.[k]?.map((message) => ({ message }))

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
          <DialogTitle>{t("connections.dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("connections.dialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <form action={action} noValidate>
          <FieldGroup>
            <Field data-invalid={!!state.fieldErrors?.name || undefined}>
              <FieldLabel htmlFor="dns-name">{c("labels.name")}</FieldLabel>
              <Input
                id="dns-name"
                name="name"
                defaultValue={state.values?.name}
                required
              />
              <FieldError errors={errs("name")} />
            </Field>
            <Field data-invalid={!!state.fieldErrors?.apiToken || undefined}>
              <FieldLabel htmlFor="dns-token">
                {t("connections.apiToken")}
              </FieldLabel>
              <Input
                id="dns-token"
                name="apiToken"
                type="password"
                autoComplete="off"
                required
              />
              <FieldDescription>{t("connections.tokenHelp")}</FieldDescription>
              <FieldError errors={errs("apiToken")} />
            </Field>
            <Field data-invalid={!!state.fieldErrors?.accountId || undefined}>
              <FieldLabel htmlFor="dns-account">
                {t("connections.accountIdOptional")}
              </FieldLabel>
              <Input
                id="dns-account"
                name="accountId"
                autoComplete="off"
                className="font-mono"
                defaultValue={state.values?.accountId}
              />
              <FieldDescription>
                {t("connections.accountIdHelp")}
              </FieldDescription>
              <FieldError errors={errs("accountId")} />
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
