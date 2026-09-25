"use client"

import {
  CloudUpload,
  Download,
  HardDriveDownload,
  RotateCcw,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
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
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createBackupAction,
  deleteBackupAction,
  restoreBackupAction,
  updateBackupScheduleAction,
} from "@/features/managed-database/managed-database.actions"
import type { BackupDestination } from "@/features/backup-destination/backup-destination.entity"
import type {
  DatabaseBackup,
  ManagedDatabase,
} from "@/features/managed-database/managed-database.entity"

const PRESETS: { label: string; cron: string }[] = [
  { label: "Nonaktif", cron: "off" },
  { label: "Setiap jam", cron: "0 * * * *" },
  { label: "Setiap hari 02:00", cron: "0 2 * * *" },
  { label: "Setiap minggu (Minggu 03:00)", cron: "0 3 * * 0" },
  { label: "Kustom", cron: "custom" },
]

function formatBytes(n: string | null) {
  if (!n) return "—"
  let v = Number(n)
  const units = ["B", "KB", "MB", "GB"]
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function DatabaseBackups({
  db,
  backups,
  running,
  destinations,
}: {
  db: ManagedDatabase
  backups: DatabaseBackup[]
  running: boolean
  destinations: BackupDestination[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<DatabaseBackup | null>(
    null
  )

  const preset = PRESETS.find((p) => p.cron === (db.backupCron ?? "off"))
  const [mode, setMode] = useState<string>(preset ? preset.cron : "custom")
  const [customCron, setCustomCron] = useState(db.backupCron ?? "")
  const [keep, setKeep] = useState(String(db.backupKeep))
  const [destination, setDestination] = useState(
    db.backupDestinationId ?? "local"
  )
  const [allDatabases, setAllDatabases] = useState(db.backupAllDatabases)
  const destinationName = (id: string | null) =>
    destinations.find((d) => d.id === id)?.name ?? null
  const effectiveCron =
    mode === "custom" ? customCron.trim() : mode === "off" ? "" : mode

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? "Gagal")
      else router.refresh()
    })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Backup</CardTitle>
              <CardDescription>
                Dump disimpan di volume <code>aoox_backups</code> di
                server ini
                {db.backupDestinationId &&
                  ` dan disalin ke ${destinationName(db.backupDestinationId) ?? "tujuan S3"}`}
                . Restore menimpa data yang ada.
              </CardDescription>
            </div>
            <Button
              size="sm"
              disabled={pending || !running}
              onClick={() => run(() => createBackupAction(db.id))}
            >
              <HardDriveDownload data-icon="inline-start" />
              {pending ? "Memproses…" : "Backup sekarang"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {backups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada backup.</p>
          ) : (
            <ul className="divide-y rounded-md border text-sm">
              {backups.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs">
                      {b.filename.split("/").pop()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(b.createdAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      · {formatBytes(b.sizeBytes)} ·{" "}
                      {b.trigger === "scheduled" ? "terjadwal" : "manual"}
                      {b.remoteKey && (b.local ? " · S3" : " · hanya di S3")}
                      {b.scope === "all" && " · semua database"}
                      {b.errorMessage && ` · ${b.errorMessage}`}
                    </span>
                  </span>
                  {b.remoteKey && (
                    <CloudUpload
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-label={`Tersalin ke ${destinationName(b.destinationId) ?? "S3"}`}
                    />
                  )}
                  <Badge
                    variant={
                      b.status === "success"
                        ? "default"
                        : b.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {b.status}
                  </Badge>
                  {b.status === "success" && (
                    <>
                      <Button
                        asChild
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Unduh"
                      >
                        <a href={`/api/backups/${b.id}/download`}>
                          <Download />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Restore"
                        disabled={pending || !running}
                        onClick={() => setRestoreTarget(b)}
                      >
                        <RotateCcw />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Hapus backup"
                    disabled={pending}
                    onClick={() => run(() => deleteBackupAction(db.id, b.id))}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jadwal & tujuan backup</CardTitle>
          <CardDescription>
            Backup terjadwal lama dihapus otomatis melebihi jumlah yang disimpan
            (juga dari S3). Tujuan S3 ditambahkan di Settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              run(() =>
                updateBackupScheduleAction(
                  db.id,
                  effectiveCron ? effectiveCron : null,
                  Math.max(1, Number(keep) || 1),
                  destination === "local" ? null : destination,
                  allDatabases
                )
              )
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="bk-preset">Frekuensi</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger id="bk-preset" className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map((p) => (
                    <SelectItem key={p.cron} value={p.cron}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {mode === "custom" && (
              <div className="space-y-1">
                <Label htmlFor="bk-cron">Cron (5 kolom)</Label>
                <Input
                  id="bk-cron"
                  value={customCron}
                  onChange={(e) => setCustomCron(e.target.value)}
                  placeholder="30 1 * * *"
                  className="w-40 font-mono"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="bk-keep">Simpan</Label>
              <Input
                id="bk-keep"
                type="number"
                min={1}
                max={365}
                value={keep}
                onChange={(e) => setKeep(e.target.value)}
                className="w-24"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bk-dest">Tujuan S3</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger id="bk-dest" className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Hanya lokal</SelectItem>
                  {destinations.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {db.engine !== "redis" && (
              <div className="flex items-center gap-2 pb-1.5">
                <Switch
                  id="bk-all"
                  checked={allDatabases}
                  onCheckedChange={setAllDatabases}
                />
                <Label htmlFor="bk-all">Semua database di server</Label>
              </div>
            )}
            <Button type="submit" variant="outline" disabled={pending}>
              Simpan
            </Button>
            <span className="text-xs text-muted-foreground">
              Sekarang:{" "}
              {db.backupCron ? <code>{db.backupCron}</code> : "nonaktif"}
            </span>
          </form>
        </CardContent>
      </Card>

      <Dialog
        open={restoreTarget !== null}
        onOpenChange={(o) => !o && setRestoreTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restore backup?</DialogTitle>
            <DialogDescription>
              Data{" "}
              <span className="font-medium text-foreground">{db.name}</span>{" "}
              saat ini akan ditimpa dengan isi{" "}
              <code>{restoreTarget?.filename.split("/").pop()}</code>. Tidak
              bisa dibatalkan — buat backup dulu kalau ragu.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreTarget(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  if (!restoreTarget) return { ok: true }
                  const r = await restoreBackupAction(db.id, restoreTarget.id)
                  if (r.ok) setRestoreTarget(null)
                  return r
                })
              }
            >
              {pending ? "Me-restore…" : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
