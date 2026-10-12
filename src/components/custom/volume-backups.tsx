"use client"

import { Archive, Download, HardDriveDownload, RotateCcw, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  DataActions,
  DataActionsHead,
  DataCell,
  DataHead,
  DataRow,
  DataTable,
  DataTableBody,
  DataTableHeader,
  IconButton,
} from "@/components/custom/data-table"
import { EmptyState } from "@/components/custom/empty-state"
import { SectionHeader } from "@/components/custom/section-header"
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
import { formatDateTime } from "@/i18n/format"
import { useLocale, useTranslations } from "next-intl"

const PRESETS: { key: string; cron: string }[] = [
  { key: "off", cron: "off" },
  { key: "hourly", cron: "0 * * * *" },
  { key: "daily", cron: "0 2 * * *" },
  { key: "weekly", cron: "0 3 * * 0" },
  { key: "custom", cron: "custom" },
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
  canEdit = true,
}: {
  app: Application
  mounts: Mount[]
  backups: VolumeBackup[]
  destinations: BackupDestination[]
  /** False for project viewers: no backup, restore, delete or schedule change. */
  canEdit?: boolean
}) {
  const t = useTranslations("applications")
  const tc = useTranslations("common")
  const locale = useLocale()
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
    volumes.find((m) => m.id === id)?.name ?? t("volumeBackups.volumeDeleted")

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? tc("states.failed"))
      else router.refresh()
    })

  if (volumes.length === 0 && backups.length === 0) return null

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t("volumeBackups.title")}
        description={t.rich("volumeBackups.description", {
          code: (chunks) => <code>{chunks}</code>,
          copied: app.backupDestinationId
            ? t("volumeBackups.copiedTo", {
                name:
                  destinations.find((d) => d.id === app.backupDestinationId)
                    ?.name ?? t("volumeBackups.s3Destination"),
              })
            : "",
        })}
        action={
          canEdit &&
          volumes.length > 0 && (
            <>
              {volumes.length > 1 && (
                <Select value={mountId} onValueChange={setMountId}>
                  <SelectTrigger
                    className="w-40"
                    aria-label={t("volumeBackups.volume")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {volumes.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                disabled={pending || !mountId}
                onClick={() =>
                  run(() => createVolumeBackupAction(app.id, mountId))
                }
              >
                <HardDriveDownload data-icon="inline-start" />
                {pending
                  ? t("volumeBackups.processing")
                  : t("volumeBackups.backupVolume", {
                      name: mountName(mountId),
                    })}
              </Button>
            </>
          )
        }
      />
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      {backups.length === 0 ? (
        <EmptyState icon={Archive} compact>
          {t("volumeBackups.empty")}
        </EmptyState>
      ) : (
        <DataTable minWidth="min-w-[52rem]">
          <DataTableHeader>
            <DataHead>{t("volumeBackups.columns.file")}</DataHead>
            <DataHead>{t("volumeBackups.columns.volume")}</DataHead>
            <DataHead>{t("volumeBackups.columns.created")}</DataHead>
            <DataHead>{t("volumeBackups.columns.size")}</DataHead>
            <DataHead>{t("volumeBackups.columns.trigger")}</DataHead>
            <DataHead>{t("volumeBackups.columns.status")}</DataHead>
            <DataActionsHead label={tc("labels.actions")} />
          </DataTableHeader>
          <DataTableBody>
            {backups.map((b) => (
              <DataRow key={b.id}>
                <DataCell mono className="max-w-64">
                  <div
                    className="truncate"
                    title={b.filename.split("/").pop()}
                  >
                    {b.filename.split("/").pop()}
                  </div>
                  {b.remoteKey && (
                    <div className="font-sans text-muted-foreground">
                      {b.local ? "S3" : t("volumeBackups.s3Only")}
                    </div>
                  )}
                  {b.errorMessage && (
                    <div className="font-sans text-wrap text-destructive">
                      {b.errorMessage}
                    </div>
                  )}
                </DataCell>
                <DataCell mono>{mountName(b.mountId)}</DataCell>
                <DataCell className="text-muted-foreground tabular-nums">
                  {formatDateTime(b.createdAt, locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </DataCell>
                <DataCell mono className="tabular-nums">
                  {formatBytes(b.sizeBytes)}
                </DataCell>
                <DataCell className="text-muted-foreground">
                  {b.trigger === "scheduled"
                    ? t("volumeBackups.scheduled")
                    : t("volumeBackups.manual")}
                </DataCell>
                <DataCell>
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
                </DataCell>
                <DataActions>
                  {b.status === "success" && (
                    <>
                      <IconButton
                        asChild
                        label={tc("actions.download")}
                      >
                        <a href={`/api/volume-backups/${b.id}/download`}>
                          <Download />
                        </a>
                      </IconButton>
                      {canEdit && (
                        <IconButton
                          label={t("volumeBackups.restore")}
                          disabled={
                            pending || !volumes.some((m) => m.id === b.mountId)
                          }
                          onClick={() => setRestoreTarget(b)}
                        >
                          <RotateCcw />
                        </IconButton>
                      )}
                    </>
                  )}
                  {canEdit && (
                    <IconButton
                      label={t("volumeBackups.deleteAria")}
                      disabled={pending}
                      onClick={() =>
                        run(() => deleteVolumeBackupAction(app.id, b.id))
                      }
                    >
                      <Trash2 />
                    </IconButton>
                  )}
                </DataActions>
              </DataRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}

      {volumes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("volumeBackups.schedule.title")}</CardTitle>
            <CardDescription>
              {t("volumeBackups.schedule.description")}
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
              <fieldset disabled={!canEdit} className="contents">
              <div className="space-y-1">
                <Label htmlFor="vbk-preset">{t("volumeBackups.schedule.frequency")}</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger id="vbk-preset" className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {PRESETS.map((p) => (
                      <SelectItem key={p.cron} value={p.cron}>
                        {t(`volumeBackups.preset.${p.key}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {mode === "custom" && (
                <div className="space-y-1">
                  <Label htmlFor="vbk-cron">{t("volumeBackups.schedule.cron")}</Label>
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
                <Label htmlFor="vbk-keep">{t("volumeBackups.schedule.keep")}</Label>
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
                <Label htmlFor="vbk-dest">{t("volumeBackups.schedule.destination")}</Label>
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger id="vbk-dest" className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="local">
                      {t("volumeBackups.schedule.localOnly")}
                    </SelectItem>
                    {destinations.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {canEdit && (
              <Button type="submit" variant="outline" disabled={pending}>
                {tc("actions.save")}
              </Button>
              )}
              </fieldset>
              <span className="text-xs text-muted-foreground">
                {t("volumeBackups.schedule.current")}{" "}
                {app.backupCron ? (
                  <code>{app.backupCron}</code>
                ) : (
                  t("volumeBackups.schedule.off")
                )}
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
            <DialogTitle>{t("volumeBackups.restoreDialog.title")}</DialogTitle>
            <DialogDescription>
              {t.rich("volumeBackups.restoreDialog.description", {
                strong: (chunks) => (
                  <span className="font-medium text-foreground">{chunks}</span>
                ),
                code: (chunks) => <code>{chunks}</code>,
                volume: restoreTarget ? mountName(restoreTarget.mountId) : "",
                file: restoreTarget?.filename.split("/").pop() ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreTarget(null)}>
              {tc("actions.cancel")}
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
              {pending ? t("volumeBackups.restoring") : t("volumeBackups.restore")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
