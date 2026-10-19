"use client"

import { PathArrow } from "@/components/custom/arrows"
import { Copy, RefreshCw, ShieldCheck, ShieldOff } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { WebhookInfo } from "@/features/application/application.entity"
import { copyToClipboard } from "@/lib/clipboard"

/** What the card needs to change a webhook; both return the fresh info. */
export type WebhookResult = Promise<
  { ok: true; data: WebhookInfo } | { ok: false; error: string }
>

/**
 * Webhook URL, provider instructions, shared secret and token rotation.
 * Applications and compose stacks use the same contract (URL token plus an
 * optional signed secret), so they share this card and pass their own
 * server actions.
 */
export function WebhookCard({
  webhook,
  regenerate,
  setSecret,
  note,
  canEdit = true,
}: {
  webhook: WebhookInfo
  regenerate: () => WebhookResult
  setSecret: (enabled: boolean) => WebhookResult
  /** Extra line under the description (e.g. a template stack has no repo). */
  note?: React.ReactNode
  /** False for project viewers: URL and secret stay visible, no rotate/regenerate. */
  canEdit?: boolean
}) {
  const t = useTranslations("applications")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState(webhook)

  const run = (fn: () => WebhookResult) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (r.ok) setCurrent(r.data)
      else setError(r.error)
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("webhook.title")}</CardTitle>
        <CardDescription className="max-w-3xl">
          {t.rich("webhook.description", {
            code: (chunks) => <code>{chunks}</code>,
            branch: current.branch,
          })}
          {note}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-xs">
            {current.url}
          </code>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={t("webhook.copyUrlAria")}
            onClick={() =>
              void copyToClipboard(current.url).then((ok) =>
                ok
                  ? toast.success(t("webhook.urlCopied"))
                  : toast.error(t("webhook.urlCopyFailed"))
              )
            }
          >
            <Copy />
          </Button>
        </div>

        <ol className="list-decimal space-y-1 ps-5 text-muted-foreground">
          <li>
            {t.rich("webhook.steps.github", {
              p: (chunks) => <span className="text-foreground">{chunks}</span>,
              code: (chunks) => <code>{chunks}</code>,
              em: (chunks) => <em>{chunks}</em>,
              arrow: () => <PathArrow />,
              hasSecret: String(!!current.secret),
            })}
          </li>
          <li>
            {t.rich("webhook.steps.gitlab", {
              p: (chunks) => <span className="text-foreground">{chunks}</span>,
              em: (chunks) => <em>{chunks}</em>,
              arrow: () => <PathArrow />,
              hasSecret: String(!!current.secret),
            })}
          </li>
          <li>
            {t.rich("webhook.steps.reachable", {
              code: (chunks) => <code>{chunks}</code>,
            })}
          </li>
        </ol>

        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center gap-2">
            {current.secret ? (
              <ShieldCheck className="size-4 text-muted-foreground" />
            ) : (
              <ShieldOff className="size-4 text-muted-foreground" />
            )}
            <span className="font-medium">{t("webhook.secret.title")}</span>
            <span className="text-xs text-muted-foreground">
              {current.secret
                ? t("webhook.secret.activeNote")
                : t("webhook.secret.inactiveNote")}
            </span>
          </div>
          {current.secret && (
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-xs">
                {current.secret}
              </code>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={t("webhook.secret.copyAria")}
                onClick={() =>
                  void copyToClipboard(current.secret ?? "").then((ok) =>
                    ok
                      ? toast.success(t("webhook.secret.copied"))
                      : toast.error(t("webhook.secret.copyFailed"))
                  )
                }
              >
                <Copy />
              </Button>
            </div>
          )}
          {canEdit && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(() => setSecret(true))}
            >
              {current.secret ? t("webhook.secret.rotate") : t("webhook.secret.enable")}
            </Button>
            {current.secret && (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => run(() => setSecret(false))}
              >
                {t("webhook.secret.disable")}
              </Button>
            )}
          </div>
          )}
        </div>

        {canEdit && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run(() => regenerate())}
          >
            <RefreshCw data-icon="inline-start" />
            {t("webhook.regenerate")}
          </Button>
          <span className="text-xs text-muted-foreground">
            {t("webhook.regenerateNote")}
          </span>
        </div>
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

/**
 * Shown to project viewers instead of {@link WebhookCard}: the URL token and
 * secret are enough to trigger deploys, so the API only gives them to
 * developers and above.
 */
export function WebhookHiddenCard() {
  const t = useTranslations("applications")
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("webhook.title")}</CardTitle>
        <CardDescription className="max-w-3xl">
          {t("webhook.viewerHidden")}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
