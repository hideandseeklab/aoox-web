"use client"

import { Copy, Database, Eye, EyeOff, Play, Square, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SchemaInfo } from "@/features/managed-database/data-browser.entity"
import {
  deleteDatabaseAction,
  startDatabaseAction,
  stopDatabaseAction,
} from "@/features/managed-database/managed-database.actions"
import type {
  DatabaseConnection,
  ManagedDatabaseDetail,
} from "@/features/managed-database/managed-database.entity"

/** Swaps the database name at the end of a connection URL (`…:5432/app` → `…:5432/reports`). */
function withDatabase(url: string, name: string): string {
  return url.replace(/\/[^/?#]*(?=[?#]|$)/, `/${name}`)
}

export function DatabasePanel({
  db,
  connection: primary,
  schemas = [],
}: {
  db: ManagedDatabaseDetail
  connection: DatabaseConnection
  /** Other databases on the same server (see the Data tab); primary first. */
  schemas?: SchemaInfo[]
}) {
  const router = useRouter()
  // Same host/user/password for every database on the server; only the
  // name (and thus the URL path) changes with the selection.
  const [selected, setSelected] = useState(primary.database)
  const connection: DatabaseConnection =
    selected && selected !== primary.database
      ? {
          ...primary,
          database: selected,
          internalUrl: withDatabase(primary.internalUrl, selected),
          externalUrl: primary.externalUrl
            ? withDatabase(primary.externalUrl, selected)
            : null,
        }
      : primary
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [reveal, setReveal] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // While provisioning, refresh until the API reports a terminal status.
  useEffect(() => {
    if (db.status !== "creating") return
    const t = setInterval(() => router.refresh(), 3000)
    return () => clearInterval(t)
  }, [db.status, router])

  const running = db.container?.state === "running"
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? "Gagal")
      else router.refresh()
    })

  const mask = (s: string) =>
    reveal ? s : s.replace(/:[^:@/]+@/, ":••••••••@")

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {db.container &&
          (running ? (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => run(() => stopDatabaseAction(db.id))}
            >
              <Square data-icon="inline-start" />
              Stop
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => run(() => startDatabaseAction(db.id))}
            >
              <Play data-icon="inline-start" />
              Start
            </Button>
          ))}
        <Button variant="ghost" size="sm" onClick={() => setReveal((r) => !r)}>
          {reveal ? (
            <EyeOff data-icon="inline-start" />
          ) : (
            <Eye data-icon="inline-start" />
          )}
          {reveal ? "Sembunyikan password" : "Tampilkan password"}
        </Button>
        {error && (
          <span className="text-sm text-destructive" role="alert">
            {error}
          </span>
        )}
      </div>

      {db.status === "error" && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Provisioning gagal: {db.errorMessage}
        </p>
      )}

      {schemas.length > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <Database className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground">Koneksi untuk database</span>
          <Select value={selected ?? ""} onValueChange={setSelected}>
            <SelectTrigger size="sm" className="w-64 font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {schemas.map((s) => (
                <SelectItem key={s.name} value={s.name}>
                  {s.name}
                  {s.isPrimary && (
                    <span className="text-muted-foreground"> · utama</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Koneksi internal</CardTitle>
            <CardDescription>
              Dari aplikasi di project ini (network <code>aoox</code>).
              Tempel ke env aplikasi, mis. <code>DATABASE_URL</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Host" value={connection.internalHost} />
            <Row label="Port" value={String(connection.internalPort)} />
            {connection.database && (
              <Row label="Database" value={connection.database} />
            )}
            <Row label="User" value={connection.username} />
            <Row
              label="Password"
              value={reveal ? connection.password : "••••••••"}
              copy={connection.password}
            />
            <Row
              label="URL"
              value={mask(connection.internalUrl)}
              copy={connection.internalUrl}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Koneksi eksternal</CardTitle>
            <CardDescription>
              {connection.externalUrl
                ? `Dipublikasikan di port host ${connection.externalPort}.`
                : "Tidak dipublikasikan — hanya bisa diakses dari network aoox."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {connection.externalUrl ? (
              <>
                <Row label="Host" value={connection.externalHost ?? ""} />
                <Row label="Port" value={String(connection.externalPort)} />
                <Row
                  label="URL"
                  value={mask(connection.externalUrl)}
                  copy={connection.externalUrl}
                />
              </>
            ) : (
              <p className="text-muted-foreground">
                Buat ulang database dengan port host bila perlu akses dari luar.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <Trash2 data-icon="inline-start" />
            Hapus database
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus {db.name}?</DialogTitle>
            <DialogDescription>
              Container dihentikan dan dihapus. Pilih apakah data (volume) ikut
              dihapus — ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Batal
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                start(() => deleteDatabaseAction(db.id, db.projectId, false))
              }
            >
              Hapus, simpan data
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(() => deleteDatabaseAction(db.id, db.projectId, true))
              }
            >
              Hapus beserta data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Row({
  label,
  value,
  copy,
}: {
  label: string
  value: string
  copy?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <code className="min-w-0 flex-1 truncate rounded bg-muted px-1.5 py-0.5 text-xs">
        {value}
      </code>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Salin ${label}`}
        onClick={() => void navigator.clipboard.writeText(copy ?? value)}
      >
        <Copy />
      </Button>
    </div>
  )
}
