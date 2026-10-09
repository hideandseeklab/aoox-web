"use client"

import {
  Archive,
  CloudUpload,
  Download,
  HardDriveDownload,
  RotateCcw,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { EmptyState } from "@/components/custom/empty-state"
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
import { formatDateTime, formatNumber } from "@/i18n/format"
import { useLocale, useTranslations } from "next-intl"

const PRESETS: { key: string; cron: string }[] = [
  { key: "off", cron: "off" },
  { key: "hourly", cron: "0 * * * *" },
  { key: "daily", cron: "0 2 * * *" },
  { key: "weekly", cron: "0 3 * * 0" },
  { key: "custom", cron: "custom" },
]

function formatBytes(n: string | null, locale: string) {
  if (!n) return "—"
  let v = Number(n)
  const units = ["B", "KB", "MB", "GB"]
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${formatNumber(v, locale, {
    minimumFractionDigits: i === 0 ? 0 : 1,
    maximumFractionDigits: i === 0 ? 0 : 1,
  })} ${units[i]}`
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
  const t = useTranslations("database")
  const tc = useTranslations("common")
  const locale = useLocale()
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
      if (!r.ok) setError(r.error ?? tc("messages.genericError"))
      else router.refresh()
    })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{t("backups.title")}</CardTitle>
              <CardDescription>
                {t.rich(
                  db.backupDestinationId
                    ? "backups.descriptionWithDestination"
                    : "backups.description",
                  {
                    code: (chunks) => <code>{chunks}</code>,
                    destination:
                      destinationName(db.backupDestinationId) ??
                      t("backups.s3Destination"),
                  }
                )}
              </CardDescription>
            </div>
            <Button
              size="sm"
              disabled={pending || !running}
              onClick={() => run(() => createBackupAction(db.id))}
            >
              <HardDriveDownload data-icon="inline-start" />
              {pending ? tc("states.working") : t("backups.backupNow")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          {backups.length === 0 ? (
            <EmptyState icon={Archive} compact>
              {t("backups.empty")}
            </EmptyState>
          ) : (
            <ul className="divide-y rounded-md border text-xs">
              {backups.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs">
                      {b.filename.split("/").pop()}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatDateTime(b.createdAt, locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      · {formatBytes(b.sizeBytes, locale)} ·{" "}
                      {t(`backups.trigger.${b.trigger}`)}
                      {b.remoteKey &&
                        ` · ${b.local ? t("backups.s3") : t("backups.s3Only")}`}
                      {b.scope === "all" && ` · ${t("backups.allDatabases")}`}
                      {b.errorMessage && ` · ${b.errorMessage}`}
                    </span>
                  </span>
                  {b.remoteKey && (
                    <CloudUpload
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-label={t("backups.copiedTo", {
                        destination: destinationName(b.destinationId) ?? "S3",
                      })}
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
                    {t(`status.backup.${b.status}`)}
                  </Badge>
                  {b.status === "success" && (
                    <>
                      <Button
                        asChild
                        variant="ghost"
                        size="icon-sm"
                        aria-label={tc("actions.download")}
                      >
                        <a href={`/api/backups/${b.id}/download`}>
                          <Download />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("backups.restore")}
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
                    aria-label={t("backups.deleteAria")}
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
          <CardTitle>{t("backups.schedule.title")}</CardTitle>
          <CardDescription>
            {t("backups.schedule.description")}
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
              <Label htmlFor="bk-preset">{t("backups.schedule.frequency")}</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger id="bk-preset" className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map((p) => (
                    <SelectItem key={p.cron} value={p.cron}>
                      {t(`backups.presets.${p.key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {mode === "custom" && (
              <div className="space-y-1">
                <Label htmlFor="bk-cron">{t("backups.schedule.cron")}</Label>
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
              <Label htmlFor="bk-keep">{t("backups.schedule.keep")}</Label>
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
              <Label htmlFor="bk-dest">{t("backups.schedule.destination")}</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger id="bk-dest" className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">{t("backups.schedule.localOnly")}</SelectItem>
                  {destinations.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {db.engine !== "redis" && db.engine !== "valkey" && (
              <div className="flex items-center gap-2 pb-1.5">
                <Switch
                  id="bk-all"
                  checked={allDatabases}
                  onCheckedChange={setAllDatabases}
                />
                <Label htmlFor="bk-all">{t("backups.schedule.allDatabases")}</Label>
              </div>
            )}
            <Button type="submit" variant="outline" disabled={pending}>
              {tc("actions.save")}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t("backups.schedule.current")}{" "}
              {db.backupCron ? (
                <code>{db.backupCron}</code>
              ) : (
                t("backups.schedule.currentOff")
              )}
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
            <DialogTitle>{t("backups.restoreDialog.title")}</DialogTitle>
            <DialogDescription>
              {t.rich("backups.restoreDialog.description", {
                name: db.name,
                file: restoreTarget?.filename.split("/").pop() ?? "",
                b: (chunks) => (
                  <span className="font-medium text-foreground">{chunks}</span>
                ),
                code: (chunks) => <code>{chunks}</code>,
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
                  const r = await restoreBackupAction(db.id, restoreTarget.id)
                  if (r.ok) setRestoreTarget(null)
                  return r
                })
              }
            >
              {pending ? t("backups.restoreDialog.restoring") : t("backups.restore")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
