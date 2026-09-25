"use client"

import { Copy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { TerminalStatus } from "@/features/terminal/terminal.entity"

const KEY_SOURCE_LABEL = {
  "env-key": "key dari konfigurasi",
  "env-password": "password dari konfigurasi",
  generated: "key otomatis",
} as const

/** Settings card: how the web terminal reaches the host and, for the
 *  auto-generated key, the one-time command that authorizes it. */
export function TerminalCard({ status }: { status: TerminalStatus }) {
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
                  Shell di host lewat SSH ke <code>{target}</code>
                  {status.keySource &&
                    ` (${KEY_SOURCE_LABEL[status.keySource]})`}
                  .
                </>
              ) : (
                <>
                  Shell lokal di samping proses API. Di Docker, set{" "}
                  <code>TERMINAL_SSH_HOST</code> agar terminal masuk ke host.
                </>
              )}
            </CardDescription>
          </div>
          {status.error ? (
            <Badge variant="destructive">Perlu perhatian</Badge>
          ) : (
            <Badge variant={status.mode === "ssh" ? "default" : "secondary"}>
              {status.mode === "ssh" ? "SSH" : "Lokal"}
            </Badge>
          )}
        </div>
      </CardHeader>
      {status.mode === "ssh" && (
        <CardContent className="space-y-3 text-sm">
          {status.error && (
            <p className="text-destructive" role="alert">
              {status.error}
            </p>
          )}
          {status.authorizeCommand && (
            <div className="space-y-1.5">
              <p className="text-muted-foreground">
                Jalankan sekali di host sebagai user{" "}
                <code>{status.username}</code> agar key ini diizinkan login:
              </p>
              <CommandBox label="perintah" value={status.authorizeCommand} />
            </div>
          )}
          {status.publicKey && (
            <div className="space-y-1.5">
              <p className="text-muted-foreground">Public key:</p>
              <CommandBox label="public key" value={status.publicKey} />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function CommandBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <pre className="min-w-0 flex-1 overflow-x-auto rounded bg-muted px-2 py-1.5 font-mono text-xs break-all whitespace-pre-wrap">
        {value}
      </pre>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Salin ${label}`}
        onClick={() => void navigator.clipboard.writeText(value)}
      >
        <Copy />
      </Button>
    </div>
  )
}
