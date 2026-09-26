"use client"

import { useState, useTransition } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  applyInstanceUpdateAction,
  checkInstanceUpdateAction,
} from "@/features/instance-update/instance-update.actions"
import type { InstanceUpdateStatus } from "@/features/instance-update/instance-update.entity"

/**
 * Checks aoox's own `api`/`web` images against the registry and applies the
 * update (pull + restart) from the dashboard, instead of SSH + manual
 * `docker compose pull && up -d`. Applying recreates this very panel, so the
 * browser loses the connection for a few seconds — that's expected.
 */
export function InstanceUpdateCard({ status }: { status: InstanceUpdateStatus }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState(status)
  const [applied, setApplied] = useState(false)

  const available = current.api.updateAvailable || current.web.updateAvailable

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update aoox</CardTitle>
        <CardDescription>
          Cek dan terapkan update untuk panel ini sendiri — versi berjalan{" "}
          <code>{current.currentVersion}</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!current.installDirConfigured && (
          <Alert variant="destructive">
            <AlertTitle>INSTALL_DIR belum diisi</AlertTitle>
            <AlertDescription>
              Set <code>INSTALL_DIR</code> di <code>.env.dist</code> ke path
              absolut folder <code>docker-compose.dist.yml</code> di server
              ini, lalu restart stack sebelum menerapkan update dari sini.
            </AlertDescription>
          </Alert>
        )}

        <ul className="divide-y rounded-md border text-sm">
          <ImageRow label="api" image={current.api} />
          <ImageRow label="web" image={current.web} />
        </ul>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null)
                const r = await checkInstanceUpdateAction()
                if (r.ok) setCurrent(r.data)
                else setError(r.error)
              })
            }
          >
            {pending ? "Mengecek…" : "Cek update"}
          </Button>
          <Button
            size="sm"
            disabled={pending || !available || !current.installDirConfigured}
            onClick={() =>
              start(async () => {
                setError(null)
                setApplied(false)
                const r = await applyInstanceUpdateAction()
                if (r.ok) setApplied(true)
                else setError(r.error)
              })
            }
          >
            Terapkan update
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {applied && (
          <Alert>
            <AlertTitle>Diterapkan</AlertTitle>
            <AlertDescription>
              Panel akan pull image baru dan restart beberapa detik lagi —
              koneksi ke dashboard ini akan sempat terputus, itu wajar. Muat
              ulang halaman setelah itu.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

function ImageRow({
  label,
  image,
}: {
  label: string
  image: InstanceUpdateStatus["api"]
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {image.image}
        </p>
      </div>
      {image.currentDigest === null ? (
        <Badge variant="outline">baseline baru</Badge>
      ) : image.updateAvailable ? (
        <Badge>Update tersedia</Badge>
      ) : (
        <Badge variant="secondary">Terbaru</Badge>
      )}
    </li>
  )
}
