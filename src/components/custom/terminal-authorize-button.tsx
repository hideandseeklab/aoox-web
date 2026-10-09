"use client"

import { KeyRound } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import { Button } from "@/components/ui/button"
import { authorizeTerminalAction } from "@/features/terminal/terminal.actions"

/**
 * Owner-only button that lets the panel add its SSH key to the host user's
 * `authorized_keys` instead of running the manual command. The manual command stays visible next
 * to it as the fallback. `onAuthorized` runs after a verified login (the terminal reconnects).
 */
export function TerminalAuthorizeButton({
  user,
  onAuthorized,
}: {
  /** Host user whose authorized_keys will receive the key. */
  user: string
  onAuthorized?: () => void
}) {
  const t = useTranslations("terminal.authorize")
  return (
    <ConfirmDialog
      tone="neutral"
      trigger={
        <Button type="button" variant="outline" size="sm">
          <KeyRound data-icon="inline-start" />
          {t("button")}
        </Button>
      }
      title={t("title")}
      description={
        t.rich("description", {
          user,
          code: (c) => <code>{c}</code>,
        })
      }
      confirmLabel={t("confirm")}
      onConfirm={async () => {
        const r = await authorizeTerminalAction()
        if (!r.ok) return { ok: false, error: r.error }
        if (r.data.verified) {
          toast.success(t("ready"))
          onAuthorized?.()
        } else {
          toast.warning(r.data.message)
        }
        return { ok: true }
      }}
    />
  )
}
