"use client"

import { Copy, RefreshCw, ShieldCheck, ShieldOff } from "lucide-react"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { WebhookInfo } from "@/features/application/application.entity"

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
}: {
  webhook: WebhookInfo
  regenerate: () => WebhookResult
  setSecret: (enabled: boolean) => WebhookResult
  /** Extra line under the description (e.g. "a template stack has no repo"). */
  note?: React.ReactNode
}) {
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
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Webhook auto-deploy</CardTitle>
        <CardDescription>
          Setiap push ke branch <code>{current.branch}</code> memicu deploy.
          Push ke branch lain diabaikan; kalau deploy sedang berjalan, event
          dilewati.
          {note}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-xs">
            {current.url}
          </code>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Salin URL webhook"
            onClick={() => void navigator.clipboard.writeText(current.url)}
          >
            <Copy />
          </Button>
        </div>

        <ol className="list-decimal space-y-1 ps-5 text-muted-foreground">
          <li>
            <span className="text-foreground">GitHub:</span> Settings → Webhooks
            → Add webhook. Payload URL = URL di atas, Content type{" "}
            <code>application/json</code>, event <em>Just the push event</em>
            {current.secret && (
              <>
                , <em>Secret</em> = secret di bawah
              </>
            )}
            .
          </li>
          <li>
            <span className="text-foreground">GitLab:</span> Settings →
            Webhooks. URL = URL di atas, trigger <em>Push events</em>
            {current.secret && (
              <>
                , <em>Secret token</em> = secret di bawah
              </>
            )}
            .
          </li>
          <li>
            Pastikan API ini bisa dijangkau dari internet (
            <code>PUBLIC_API_URL</code>).
          </li>
        </ol>

        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center gap-2">
            {current.secret ? (
              <ShieldCheck className="size-4 text-muted-foreground" />
            ) : (
              <ShieldOff className="size-4 text-muted-foreground" />
            )}
            <span className="font-medium">Secret (tanda tangan)</span>
            <span className="text-xs text-muted-foreground">
              {current.secret
                ? "Aktif — request tanpa X-Hub-Signature-256 / X-Gitlab-Token yang cocok ditolak (401)."
                : "Nonaktif — siapa pun yang tahu URL bisa memicu deploy."}
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
                aria-label="Salin secret"
                onClick={() =>
                  void navigator.clipboard.writeText(current.secret ?? "")
                }
              >
                <Copy />
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(() => setSecret(true))}
            >
              {current.secret ? "Rotasi secret" : "Aktifkan secret"}
            </Button>
            {current.secret && (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => run(() => setSecret(false))}
              >
                Nonaktifkan
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run(() => regenerate())}
          >
            <RefreshCw data-icon="inline-start" />
            Buat URL baru
          </Button>
          <span className="text-xs text-muted-foreground">
            URL lama langsung tidak berlaku.
          </span>
        </div>
        {error && (
          <p className="text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
