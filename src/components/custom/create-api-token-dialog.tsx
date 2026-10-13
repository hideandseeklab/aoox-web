"use client"

import { Check, Copy, Loader2, Plus, TriangleAlert, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
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
import { createApiTokenAction } from "@/features/api-token/api-token.actions"
import {
  MAX_VARIABLE_SCOPES,
  VARIABLE_SCOPE,
} from "@/features/variable-set/variable-set.entity"
import { copyToClipboard } from "@/lib/clipboard"

const EXPIRY: { labelKey: string; days: number | null }[] = [
  { labelKey: "days30", days: 30 },
  { labelKey: "days90", days: 90 },
  { labelKey: "year1", days: 365 },
  { labelKey: "never", days: null },
]

/**
 * "Create token" button + dialog. Step one is the form; on success the same
 * dialog switches to the one-time plaintext view (token, curl example, CLI
 * login). The plaintext lives only in this component's state and is dropped
 * when the dialog closes. The header and footer stay put while the fields
 * scroll, so the buttons remain visible on small screens.
 */
export function CreateApiTokenDialog({
  projects,
  publicApiUrl,
  webOrigin,
}: {
  /** For the project picker; empty hides it. */
  projects: { id: string; name: string }[]
  publicApiUrl: string
  /** Fallback dashboard address for the CLI login command (`WEB_ORIGIN`). */
  webOrigin: string
}) {
  const t = useTranslations("settings")
  const c = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [expiry, setExpiry] = useState("30")
  const [readOnly, setReadOnly] = useState(false)
  // Empty = every project the user may see (and platform settings stay usable).
  const [scopeProjects, setScopeProjects] = useState<string[]>([])
  // Empty = every set environment the user may reach.
  const [scopes, setScopes] = useState<string[]>([])
  const [scopeInput, setScopeInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [created, setCreated] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loginCopied, setLoginCopied] = useState(false)
  // Address the user opened the dashboard with (what `aoox login --url` needs);
  // captured when the token is created because the dialog only renders client-side.
  const [dashboardUrl, setDashboardUrl] = useState(webOrigin)

  const reset = () => {
    setName("")
    setExpiry("30")
    setReadOnly(false)
    setScopeProjects([])
    setScopes([])
    setScopeInput("")
    setError(null)
    setCreated(null)
    setCopied(false)
    setLoginCopied(false)
  }

  const change = (next: boolean) => {
    if (pending) return
    setOpen(next)
    if (!next) reset()
  }

  const scopeEntry = scopeInput.trim()
  const scopeInvalid = scopeEntry !== "" && !VARIABLE_SCOPE.test(scopeEntry)
  const scopesFull = scopes.length >= MAX_VARIABLE_SCOPES
  const addScope = () => {
    if (!VARIABLE_SCOPE.test(scopeEntry) || scopesFull) return
    setScopes((cur) => (cur.includes(scopeEntry) ? cur : [...cur, scopeEntry]))
    setScopeInput("")
  }

  const copy = async () => {
    if (!created) return
    const ok = await copyToClipboard(created)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast.success(t("tokens.copied"))
    } else {
      toast.error(t("tokens.copyFailed"))
    }
  }

  const loginCommand = `aoox login --url ${dashboardUrl} --token ${created ?? ""}`

  const copyLogin = async () => {
    const ok = await copyToClipboard(loginCommand)
    if (ok) {
      setLoginCopied(true)
      setTimeout(() => setLoginCopied(false), 1500)
      toast.success(t("tokens.created.loginCopied"))
    } else {
      toast.error(t("tokens.copyFailed"))
    }
  }

  const submit = () =>
    start(async () => {
      setError(null)
      const r = await createApiTokenAction(
        name.trim(),
        expiry === "never" ? null : Number(expiry),
        {
          readOnly,
          projectIds: scopeProjects,
          variableScopes: scopes,
        }
      )
      if (!r.ok) setError(r.error)
      else {
        setDashboardUrl(window.location.origin || webOrigin)
        setCreated(r.data.token)
      }
    })

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogTrigger asChild>
        <Button>
          <Plus data-icon="inline-start" />
          {t("tokens.create")}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-lg"
        showCloseButton={!pending}
      >
        {created === null ? (
          <form
            className="flex min-h-0 flex-1 flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <DialogHeader>
              <DialogTitle>{t("tokens.dialog.title")}</DialogTitle>
              <DialogDescription>
                {t("tokens.dialog.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4 py-0.5">
              <FieldGroup className="gap-5">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
                  <Field>
                    <FieldLabel htmlFor="pat-name">
                      {c("labels.name")}
                    </FieldLabel>
                    <Input
                      id="pat-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("tokens.namePlaceholder")}
                      autoComplete="off"
                      autoFocus
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="pat-expiry">
                      {t("tokens.expiry")}
                    </FieldLabel>
                    <Select value={expiry} onValueChange={setExpiry}>
                      <SelectTrigger id="pat-expiry" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {EXPIRY.map((e) => (
                          <SelectItem
                            key={String(e.days)}
                            value={String(e.days ?? "never")}
                          >
                            {t(`tokens.expiryOptions.${e.labelKey}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field>
                  <FieldLabel>{t("tokens.permissions")}</FieldLabel>
                  <label
                    htmlFor="pat-readonly"
                    className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/40"
                  >
                    <Switch
                      id="pat-readonly"
                      checked={readOnly}
                      onCheckedChange={setReadOnly}
                      className="mt-px"
                    />
                    <span className="min-w-0 space-y-0.5">
                      <span className="block font-medium">
                        {t("tokens.readOnly")}
                      </span>
                      <span className="block text-muted-foreground">
                        {t("tokens.readOnlyHelp")}
                      </span>
                    </span>
                  </label>
                </Field>

                {projects.length > 0 && (
                  <Field>
                    <FieldLabel>{t("tokens.scopeLabel")}</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {projects.map((p) => {
                        const on = scopeProjects.includes(p.id)
                        return (
                          <button
                            key={p.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() =>
                              setScopeProjects((cur) =>
                                on
                                  ? cur.filter((id) => id !== p.id)
                                  : [...cur, p.id]
                              )
                            }
                            className={`max-w-full truncate rounded-full border px-3 py-1 text-xs ${
                              on
                                ? "border-primary bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {p.name}
                          </button>
                        )
                      })}
                    </div>
                    <FieldDescription>{t("tokens.scopeHelp")}</FieldDescription>
                  </Field>
                )}

                <Field data-invalid={scopeInvalid || undefined}>
                  <FieldLabel htmlFor="pat-var-scope">
                    {t("tokens.variableScopeLabel")}
                  </FieldLabel>
                  {scopes.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                      {scopes.map((sc) => (
                        <li key={sc} className="min-w-0">
                          <Badge
                            variant="secondary"
                            className="max-w-full gap-1 pe-0.5"
                          >
                            <span className="truncate font-mono">{sc}</span>
                            <button
                              type="button"
                              className="rounded-sm p-0.5 hover:bg-background/60"
                              aria-label={t("tokens.variableScopeRemove", {
                                scope: sc,
                              })}
                              onClick={() =>
                                setScopes((cur) => cur.filter((x) => x !== sc))
                              }
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      id="pat-var-scope"
                      value={scopeInput}
                      onChange={(e) =>
                        setScopeInput(e.target.value.toLowerCase())
                      }
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return
                        e.preventDefault()
                        addScope()
                      }}
                      placeholder="backend/staging"
                      maxLength={98}
                      autoComplete="off"
                      aria-invalid={scopeInvalid || undefined}
                      disabled={scopesFull}
                      className="min-w-0 flex-1 font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!VARIABLE_SCOPE.test(scopeEntry) || scopesFull}
                      onClick={addScope}
                    >
                      <Plus data-icon="inline-start" />
                      {t("tokens.variableScopeAdd")}
                    </Button>
                  </div>
                  {scopeInvalid ? (
                    <FieldDescription className="text-destructive" role="alert">
                      {t("tokens.variableScopeInvalid")}
                    </FieldDescription>
                  ) : scopesFull ? (
                    <FieldDescription>
                      {t("tokens.variableScopeMax", {
                        count: MAX_VARIABLE_SCOPES,
                      })}
                    </FieldDescription>
                  ) : null}
                  <FieldDescription>
                    {t.rich("tokens.variableScopeForms", {
                      code: (chunks) => (
                        <code className="font-mono text-foreground">
                          {chunks}
                        </code>
                      ),
                    })}{" "}
                    {t("tokens.variableScopeHelp")}
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </div>
            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => change(false)}
              >
                {c("actions.cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                )}
                {pending ? c("states.creating") : t("tokens.create")}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{t("tokens.created.title")}</DialogTitle>
              <DialogDescription className="sr-only">
                {t("tokens.created.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="-mx-4 min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-0.5">
              <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                <TriangleAlert />
                <AlertDescription className="text-amber-700/90 dark:text-amber-400/90">
                  {t("tokens.created.description")}
                </AlertDescription>
              </Alert>
              <div className="flex min-w-0 items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-xs">
                  {created}
                </code>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={t("tokens.copyAria")}
                  onClick={copy}
                >
                  {copied ? <Check /> : <Copy />}
                </Button>
              </div>
              <pre className="min-w-0 overflow-auto rounded bg-muted p-2 font-mono text-xs">
                {`curl -X POST ${publicApiUrl}/applications/<id>/deploy \\\n  -H "Authorization: Bearer ${created}"`}
              </pre>
              <div className="min-w-0 space-y-1.5">
                <p className="text-xs font-medium">
                  {t("tokens.created.loginTitle")}
                </p>
                <div className="flex items-start gap-2">
                  <code className="min-w-0 flex-1 rounded bg-muted px-2 py-1.5 font-mono text-xs break-all">
                    {loginCommand}
                  </code>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={t("tokens.created.copyLoginAria")}
                    onClick={copyLogin}
                  >
                    {loginCopied ? <Check /> : <Copy />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t.rich("tokens.created.cliHint", {
                    code: (chunks) => (
                      <code className="font-mono [overflow-wrap:anywhere]">
                        {chunks}
                      </code>
                    ),
                  })}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => change(false)}>{t("tokens.done")}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
