"use client"

import { KeyRound } from "lucide-react"
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
  return (
    <ConfirmDialog
      tone="neutral"
      trigger={
        <Button type="button" variant="outline" size="sm">
          <KeyRound data-icon="inline-start" />
          Otorisasi otomatis
        </Button>
      }
      title="Otorisasi key SSH terminal?"
      description={
        <>
          aoox akan menambahkan public key platform ke{" "}
          <code>~/.ssh/authorized_keys</code> milik user <code>{user}</code> di
          host ini. Tidak ada password atau private key yang ditulis.
        </>
      }
      confirmLabel="Otorisasi"
      onConfirm={async () => {
        const r = await authorizeTerminalAction()
        if (!r.ok) return { ok: false, error: r.error }
        if (r.data.verified) {
          toast.success("Terminal siap")
          onAuthorized?.()
        } else {
          toast.warning(r.data.message)
        }
        return { ok: true }
      }}
    />
  )
}
