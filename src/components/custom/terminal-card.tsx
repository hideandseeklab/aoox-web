"use client"

import { Copy } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { TerminalAuthorizeButton } from "@/components/custom/terminal-authorize-button"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { TerminalStatus } from "@/features/terminal/terminal.entity"
import { copyToClipboard } from "@/lib/clipboard"

const KEY_SOURCE_KEY = {
  "env-key": "envKey",
  "env-password": "envPassword",
  generated: "generated",
} as const

/** Settings card: how the web terminal reaches the host and, for the
 *  auto-generated key, the one-time command that authorizes it. */
export function TerminalCard({
  status,
  canAutoAuthorize = false,
}: {
  status: TerminalStatus
  /** Owner and the API allows it: show the button above the manual command. */
  canAutoAuthorize?: boolean
}) {
  const t = useTranslations("terminal.card")
  const target =
    status.mode === "ssh"
      ? `${status.username ?? "?"}@${status.host}:${status.port}`
      : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Terminal</CardTitle>
            <CardDescription>
              {status.mode === "ssh" ? (
                <>
                  {t.rich("sshDescription", {
                    target: target ?? "",
                    code: (c) => <code>{c}</code>,
                  })}
                  {status.usernameSource === "default" &&
                    ` ${t("defaultUser")}`}
                  {status.keySource &&
                    ` (${t(`keySource.${KEY_SOURCE_KEY[status.keySource]}`)})`}
                  .
                </>
              ) : (
                t.rich("localDescription", {
                  code: (c) => <code>{c}</code>,
                })
              )}
            </CardDescription>
          </div>
          {status.error ? (
            <Badge variant="destructive">{t("needsAttention")}</Badge>
          ) : (
            <Badge variant={status.mode === "ssh" ? "default" : "secondary"}>
              {status.mode === "ssh" ? "SSH" : t("local")}
            </Badge>
          )}
        </div>
      </CardHeader>
      {status.mode === "ssh" && (
        <CardContent className="space-y-3 text-xs">
          {status.error && (
            <p className="text-destructive" role="alert">
              {status.error}
            </p>
          )}
          {status.authorizeCommand && canAutoAuthorize && status.username && (
            <div>
              <TerminalAuthorizeButton user={status.username} />
            </div>
          )}
          {status.authorizeCommand && (
            <div className="space-y-1.5">
              <p className="text-muted-foreground">
                {t.rich("authorizeInstruction", {
                  user: status.username ?? "",
                  code: (c) => <code>{c}</code>,
                })}
              </p>
              <CommandBox label={t("commandLabel")} value={status.authorizeCommand} />
            </div>
          )}
          {status.publicKey && (
            <div className="space-y-1.5">
              <p className="text-muted-foreground">{t("publicKey")}</p>
              <CommandBox label={t("publicKeyLabel")} value={status.publicKey} />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function CommandBox({ label, value }: { label: string; value: string }) {
  const t = useTranslations("terminal.card")
  return (
    <div className="flex items-start gap-2">
      <pre className="min-w-0 flex-1 overflow-x-auto rounded bg-muted px-2 py-1.5 font-mono text-xs break-all whitespace-pre-wrap">
        {value}
      </pre>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("copy", { label })}
        onClick={() =>
          void copyToClipboard(value).then((ok) =>
            ok
              ? toast.success(t("copied", { label }))
              : toast.error(t("copyFailed", { label }))
          )
        }
      >
        <Copy />
      </Button>
    </div>
  )
}
