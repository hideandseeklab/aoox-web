"use client"

import { Download, HardDriveDownload, RotateCcw, Trash2 } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  Application,
  Mount,
} from "@/features/application/application.entity"
import type { BackupDestination } from "@/features/backup-destination/backup-destination.entity"
import {
  createVolumeBackupAction,
  deleteVolumeBackupAction,
  restoreVolumeBackupAction,
  updateVolumeBackupScheduleAction,
} from "@/features/volume-backup/volume-backup.actions"
import type { VolumeBackup } from "@/features/volume-backup/volume-backup.entity"

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

/**
 * Backups of the application's volume mounts (tar.gz in the shared backups
 * volume, optionally copied to S3), with a schedule shared by all volumes
 * of the app. Restore stops the container while the volume is rewritten.
 */
export function VolumeBackups({
  app,
  mounts,
  backups,
  destinations,
}: {
  app: Application
  mounts: Mount[]
  backups: VolumeBackup[]
  destinations: BackupDestination[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<VolumeBackup | null>(null)
  const volumes = mounts.filter((m) => m.type === "volume")
  const [chosenMount, setMountId] = useState("")
  // Falls back to the first volume when nothing (or a removed mount) is chosen.
  const mountId = volumes.some((m) => m.id === chosenMount)
    ? chosenMount
    : (volumes[0]?.id ?? "")

  const preset = PRESETS.find((p) => p.cron === (app.backupCron ?? "off"))
  const [mode, setMode] = useState<string>(preset ? preset.cron : "custom")
  const [customCron, setCustomCron] = useState(app.backupCron ?? "")
  const [keep, setKeep] = useState(String(app.backupKeep))
  const [destination, setDestination] = useState(
    app.backupDestinationId ?? "local"
  )
  const effectiveCron =
    mode === "custom" ? customCron.trim() : mode === "off" ? "" : mode
  const mountName = (id: string) =>
    volumes.find((m) => m.id === id)?.name ?? "(volume dihapus)"

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? "Gagal")
      else router.refresh()
    })

  if (volumes.length === 0 && backups.length === 0) return null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Backup volume</CardTitle>
              <CardDescription>
                Arsip <code>tar.gz</code> tiap volume di{" "}
                <code>aoox_backups</code>
                {app.backupDestinationId &&
                  ` dan disalin ke ${destinations.find((d) => d.id === app.backupDestinationId)?.name ?? "tujuan S3"}`}
                . Restore menghentikan container sebentar dan menimpa isi
                volume.
              </CardDescription>
            </div>
            {volumes.length > 0 && (
              <div className="flex items-center gap-2">
                {volumes.length > 1 && (
                  <Select value={mountId} onValueChange={setMountId}>
                    <SelectTrigger className="w-40" aria-label="Volume">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {volumes.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  size="sm"
                  disabled={pending || !mountId}
                  onClick={() =>
                    run(() => createVolumeBackupAction(app.id, mountId))
                  }
                >
                  <HardDriveDownload data-icon="inline-start" />
                  {pending ? "Memproses…" : `Backup ${mountName(mountId)}`}
                </Button>
              </div>
            )}
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
                      {mountName(b.mountId)} · {b.filename.split("/").pop()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(b.createdAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      · {formatBytes(b.sizeBytes)} ·{" "}
                      {b.trigger === "scheduled" ? "terjadwal" : "manual"}
                      {b.remoteKey && (b.local ? " · S3" : " · hanya di S3")}
                      {b.errorMessage && ` · ${b.errorMessage}`}
                    </span>
                  </span>
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
                        <a href={`/api/volume-backups/${b.id}/download`}>
                          <Download />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Restore"
                        disabled={
                          pending || !volumes.some((m) => m.id === b.mountId)
                        }
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
                    onClick={() =>
                      run(() => deleteVolumeBackupAction(app.id, b.id))
                    }
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {volumes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Jadwal backup volume</CardTitle>
            <CardDescription>
              Berlaku untuk semua volume aplikasi ini. Backup terjadwal lama
              dihapus melebihi jumlah yang disimpan (per volume).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                run(() =>
                  updateVolumeBackupScheduleAction(
                    app.id,
                    effectiveCron ? effectiveCron : null,
                    Math.max(1, Number(keep) || 1),
                    destination === "local" ? null : destination
                  )
                )
              }}
            >
              <div className="space-y-1">
                <Label htmlFor="vbk-preset">Frekuensi</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger id="vbk-preset" className="w-56">
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
                  <Label htmlFor="vbk-cron">Cron (5 kolom)</Label>
                  <Input
                    id="vbk-cron"
                    value={customCron}
                    onChange={(e) => setCustomCron(e.target.value)}
                    placeholder="30 1 * * *"
                    className="w-40 font-mono"
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="vbk-keep">Simpan</Label>
                <Input
                  id="vbk-keep"
                  type="number"
                  min={1}
                  max={365}
                  value={keep}
                  onChange={(e) => setKeep(e.target.value)}
                  className="w-24"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="vbk-dest">Tujuan S3</Label>
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger id="vbk-dest" className="w-56">
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
              <Button type="submit" variant="outline" disabled={pending}>
                Simpan
              </Button>
              <span className="text-xs text-muted-foreground">
                Sekarang:{" "}
                {app.backupCron ? <code>{app.backupCron}</code> : "nonaktif"}
              </span>
            </form>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={restoreTarget !== null}
        onOpenChange={(o) => !o && setRestoreTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restore volume?</DialogTitle>
            <DialogDescription>
              Isi volume{" "}
              <span className="font-medium text-foreground">
                {restoreTarget && mountName(restoreTarget.mountId)}
              </span>{" "}
              akan dihapus dan diganti dengan{" "}
              <code>{restoreTarget?.filename.split("/").pop()}</code>. Container
              dihentikan selama proses. Tidak bisa dibatalkan.
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
                  const r = await restoreVolumeBackupAction(
                    app.id,
                    restoreTarget.id
                  )
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
