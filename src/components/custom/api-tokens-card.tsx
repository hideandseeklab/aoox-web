"use client"

import { BookOpen, Check, Copy, KeySquare, Plus, Trash2 } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createApiTokenAction,
  deleteApiTokenAction,
} from "@/features/api-token/api-token.actions"
import type { ApiToken } from "@/features/api-token/api-token.entity"
import { Switch } from "@/components/ui/switch"
import { copyToClipboard } from "@/lib/clipboard"
import { formatDateTime } from "@/i18n/format"
import { useLocale, useTranslations } from "next-intl"

const EXPIRY: { labelKey: string; days: number | null }[] = [
  { labelKey: "days30", days: 30 },
  { labelKey: "days90", days: 90 },
  { labelKey: "year1", days: 365 },
  { labelKey: "never", days: null },
]

function fmt(d: string | null, locale: string) {
  return d
    ? formatDateTime(d, locale, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—"
}

/**
 * Personal access tokens for CI/CLI. The plaintext appears once in a dialog
 * after creation; the list only shows the prefix.
 */
export function ApiTokensCard({
  tokens,
  publicApiUrl,
  webOrigin,
  projects = [],
}: {
  tokens: ApiToken[]
  /** For the scope picker and the badges; empty hides the picker. */
  projects?: { id: string; name: string }[]
  publicApiUrl: string
  /** Fallback dashboard address for the CLI login command (`WEB_ORIGIN`). */
  webOrigin: string
}) {
  const t = useTranslations("settings")
  const c = useTranslations("common")
  const locale = useLocale()
  const [name, setName] = useState("")
  const [expiry, setExpiry] = useState("30")
  const [created, setCreated] = useState<string | null>(null)
  const [readOnly, setReadOnly] = useState(false)
  // Empty = every project the user may see (and platform settings stay usable).
  const [scopeProjects, setScopeProjects] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [loginCopied, setLoginCopied] = useState(false)
  // Address the user opened the dashboard with (what `aoox login --url` needs);
  // captured when the token is created because the dialog only renders client-side.
  const [dashboardUrl, setDashboardUrl] = useState(webOrigin)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  // Read once per render (React Compiler forbids Date.now() inside the map).
  const [now] = useState(() => Date.now())

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tokens.title")}</CardTitle>
        <CardDescription>
          {t.rich("tokens.description", {
            code: (chunks) => <code>{chunks}</code>,
            docs: () => (
              <a
                href={`${publicApiUrl}/docs`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline"
              >
                <BookOpen className="size-3" /> {publicApiUrl}/docs
              </a>
            ),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tokens.length === 0 && (
          <EmptyState icon={KeySquare} compact>
            {t("tokens.empty")}
          </EmptyState>
        )}
        {tokens.length > 0 && (
          <ul className="divide-y rounded-md border text-xs">
            {tokens.map((tok) => {
              const expired =
                tok.expiresAt && new Date(tok.expiresAt).getTime() < now
              return (
                <li key={tok.id} className="flex items-center gap-3 px-3 py-2">
                  <KeySquare className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {tok.name}
                    </span>
                    <span className="block truncate font-mono text-xs text-muted-foreground">
                      {t("tokens.meta", {
                        prefix: tok.prefix,
                        used: fmt(tok.lastUsedAt, locale),
                        expiry: tok.expiresAt
                          ? t("tokens.expiresOn", {
                              date: fmt(tok.expiresAt, locale),
                            })
                          : t("tokens.noExpiry"),
                      })}
                    </span>
                  </span>
                  {tok.readOnly && (
                    <Badge variant="outline">{t("tokens.readOnlyBadge")}</Badge>
                  )}
                  {tok.projectIds && (
                    <Badge
                      variant="outline"
                      title={tok.projectIds
                        .map(
                          (id) => projects.find((p) => p.id === id)?.name ?? id
                        )
                        .join(", ")}
                    >
                      {t("tokens.projectsBadge", {
                        count: tok.projectIds.length,
                      })}
                    </Badge>
                  )}
                  {expired && (
                    <Badge variant="destructive">
                      {t("tokens.expiredBadge")}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("tokens.revoke")}
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        setError(null)
                        const r = await deleteApiTokenAction(tok.id)
                        if (!r.ok) setError(r.error)
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}

        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              setError(null)
              const r = await createApiTokenAction(
                name.trim(),
                expiry === "never" ? null : Number(expiry),
                { readOnly, projectIds: scopeProjects }
              )
              if (!r.ok) setError(r.error)
              else {
                setCreated(r.data.token)
                setDashboardUrl(window.location.origin || webOrigin)
                setName("")
                setReadOnly(false)
                setScopeProjects([])
              }
            })
          }}
        >
          <div className="min-w-48 flex-1 space-y-1">
            <Label htmlFor="pat-name">{c("labels.name")}</Label>
            <Input
              id="pat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("tokens.namePlaceholder")}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pat-expiry">{t("tokens.expiry")}</Label>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger id="pat-expiry" className="w-44">
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
          </div>
          <div className="space-y-1">
            <Label htmlFor="pat-readonly">{t("tokens.permissions")}</Label>
            <label
              className="flex h-7 items-center gap-2 text-xs"
              htmlFor="pat-readonly"
            >
              <Switch
                id="pat-readonly"
                checked={readOnly}
                onCheckedChange={setReadOnly}
              />
              {t("tokens.readOnly")}
            </label>
          </div>
          {projects.length > 0 && (
            <div className="w-full space-y-1">
              <Label>{t("tokens.scopeLabel")}</Label>
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
                          on ? cur.filter((id) => id !== p.id) : [...cur, p.id]
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-xs ${
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
              <p className="text-xs text-muted-foreground">
                {t("tokens.scopeHelp")}
              </p>
            </div>
          )}
          <Button type="submit" disabled={pending}>
            <Plus data-icon="inline-start" />
            {pending ? c("states.creating") : t("tokens.create")}
          </Button>
        </form>
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>

      <Dialog
        open={created !== null}
        onOpenChange={(o) => !o && setCreated(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("tokens.created.title")}</DialogTitle>
            <DialogDescription>
              {t("tokens.created.description")}
            </DialogDescription>
          </DialogHeader>
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
            {`curl -X POST ${publicApiUrl}/applications/<id>/deploy \\\n  -H "Authorization: Bearer ${created ?? ""}"`}
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
                  <code className="font-mono [overflow-wrap:anywhere]">{chunks}</code>
                ),
              })}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreated(null)}>{t("tokens.done")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
