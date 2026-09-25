"use client"

import { Play, Trash2 } from "lucide-react"
import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  provisionProxyAction,
  removeProxyAction,
} from "@/features/proxy/proxy.actions"
import type { ProxyStatus } from "@/features/proxy/proxy.entity"

export function ProxyCard({
  status,
  canManage,
}: {
  status: ProxyStatus
  canManage: boolean
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? "Gagal")
    })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Reverse proxy (Traefik)</CardTitle>
            <CardDescription>
              Mengarahkan domain ke container aplikasi lewat label Docker. Port{" "}
              <code>{status.httpPort}</code> (HTTP) dan{" "}
              <code>{status.httpsPort}</code> (HTTPS).
            </CardDescription>
          </div>
          {!status.installed ? (
            <Badge variant="secondary">Belum ada</Badge>
          ) : status.running ? (
            <Badge>Running</Badge>
          ) : (
            <Badge variant="destructive">{status.state}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">
          Sertifikat HTTPS otomatis (Let&apos;s Encrypt):{" "}
          {status.acmeEmail ? (
            <span className="text-foreground">
              aktif untuk <code>{status.acmeEmail}</code>
            </span>
          ) : (
            <span>
              nonaktif — set <code>PROXY_ACME_EMAIL</code> di API lalu provision
              ulang.
            </span>
          )}
        </p>
        {error && (
          <p className="text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
      {canManage && (
        <CardFooter className="gap-2">
          {!status.installed ? (
            <Button
              disabled={pending}
              onClick={() => run(provisionProxyAction)}
            >
              <Play data-icon="inline-start" />
              {pending ? "Menyiapkan…" : "Provision proxy"}
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() => run(() => removeProxyAction(false))}
            >
              <Trash2 data-icon="inline-start" />
              Hapus proxy
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
