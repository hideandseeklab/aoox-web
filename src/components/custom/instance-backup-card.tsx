"use client"

import { Archive, Cloud, Download, RotateCcw, Trash2, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { EmptyState } from "@/components/custom/empty-state"
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
import type { BackupDestination } from "@/features/backup-destination/backup-destination.entity"
import {
  createInstanceBackupAction,
  deleteInstanceBackupAction,
  restoreInstanceBackupAction,
  restoreInstanceUploadAction,
  updateInstanceBackupSettingsAction,
} from "@/features/instance-backup/instance-backup.actions"
import type {
  InstanceBackup,
  InstanceBackupSettings,
  RestoreReport,
} from "@/features/instance-backup/instance-backup.entity"
import { formatDateTime } from "@/i18n/format"
import { useLocale, useTranslations } from "next-intl"

const PRESETS: { labelKey: string; cron: string }[] = [
  { labelKey: "off", cron: "off" },
  { labelKey: "daily", cron: "0 1 * * *" },
  { labelKey: "every6h", cron: "0 */6 * * *" },
  { labelKey: "weekly", cron: "0 1 * * 0" },
  { labelKey: "custom", cron: "custom" },
]

function formatBytes(n: string | null) {
  if (!n) return "—"
  const b = Number(n)
  if (b < 1024 ** 2) return `${Math.round(b / 1024)} KB`
  return `${(b / 1024 ** 2).toFixed(1)} MB`
}

/**
 * Snapshot of the panel's own database (projects, apps, users, servers,
 * settings — secrets stay encrypted). Restore replaces everything, so it
 * sits behind a confirm dialog and shows the API's warnings afterwards.
 */
export function InstanceBackupCard({
  backups,
  settings,
  destinations,
}: {
  backups: InstanceBackup[]
  settings: InstanceBackupSettings
  destinations: BackupDestination[]
}) {
  const t = useTranslations("infra.instanceBackup")
  const locale = useLocale()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<RestoreReport | null>(null)
  const [confirm, setConfirm] = useState<InstanceBackup | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const preset = PRESETS.find((p) => p.cron === (settings.backupCron ?? "off"))
  const [mode, setMode] = useState(preset ? preset.cron : "custom")
  const [customCron, setCustomCron] = useState(
    preset ? "" : (settings.backupCron ?? "")
  )
  const [keep, setKeep] = useState(String(settings.backupKeep))
  const [destination, setDestination] = useState(
    settings.destinationId ?? "local"
  )
  const effectiveCron =
    mode === "off" ? "" : mode === "custom" ? customCron.trim() : mode

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? t("failed"))
    })

  const finishRestore = (r: RestoreReport) => {
    setConfirm(null)
    setUploadOpen(false)
    setReport(r)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t.rich("description", { code: (c) => <code>{c}</code> })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(createInstanceBackupAction)}
          >
            {t("backupNow")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setUploadOpen(true)}
          >
            <Upload data-icon="inline-start" />
            {t("restoreFromFile")}
          </Button>
        </div>

        {backups.length === 0 ? (
          <EmptyState icon={Archive} compact>
            {t("empty")}
          </EmptyState>
        ) : (
          <ul className="divide-y rounded-md border text-xs">
            {backups.map((b) => (
              <li key={b.id} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>
                      {formatDateTime(b.createdAt, locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                    <Badge
                      variant={
                        b.status === "success" ? "secondary" : "destructive"
                      }
                    >
                      {b.status}
                    </Badge>
                    {b.trigger === "scheduled" && (
                      <Badge variant="outline">{t("scheduled")}</Badge>
                    )}
                    {b.remoteKey && (
                      <Cloud
                        className="size-3.5 text-muted-foreground"
                        aria-label={t("copiedToS3")}
                      />
                    )}
                    {!b.local && b.status === "success" && (
                      <Badge variant="outline">{t("onlyOnS3")}</Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground tabular-nums">
                    {formatBytes(b.sizeBytes)} · {t("rows", { count: b.rowCount })} ·{" "}
                    {b.schemaVersion ?? "?"}
                    {b.errorMessage && ` · ${b.errorMessage}`}
                  </p>
                </div>
                {b.status === "success" && (
                  <>
                    <Button
                      asChild
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("download")}
                    >
                      <a href={`/api/instance-backups/${b.id}/download`}>
                        <Download />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("restore")}
                      disabled={pending}
                      onClick={() => setConfirm(b)}
                    >
                      <RotateCcw />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("delete")}
                  disabled={pending}
                  onClick={() => run(() => deleteInstanceBackupAction(b.id))}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            run(() =>
              updateInstanceBackupSettingsAction({
                backupCron: effectiveCron || null,
                backupKeep: Math.max(1, Number(keep) || 1),
                destinationId: destination === "local" ? null : destination,
              })
            )
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="ib-preset">{t("schedule")}</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger id="ib-preset" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {PRESETS.map((p) => (
                  <SelectItem key={p.cron} value={p.cron}>
                    {t(`presets.${p.labelKey}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {mode === "custom" && (
            <div className="space-y-1">
              <Label htmlFor="ib-cron">{t("cron")}</Label>
              <Input
                id="ib-cron"
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
                placeholder="30 1 * * *"
                className="w-40 font-mono"
              />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="ib-keep">{t("keep")}</Label>
            <Input
              id="ib-keep"
              type="number"
              min={1}
              max={365}
              value={keep}
              onChange={(e) => setKeep(e.target.value)}
              className="w-24"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ib-dest">{t("destination")}</Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger id="ib-dest" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="local">{t("localOnly")}</SelectItem>
                {destinations.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" variant="outline" disabled={pending}>
            {t("saveSchedule")}
          </Button>
        </form>

        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        {report && (
          <Alert>
            <AlertTitle>
              {t("restoreDone", { rows: report.rows, tables: report.tables })}
            </AlertTitle>
            <AlertDescription>
              <ul className="list-disc space-y-1 ps-4">
                {report.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <Dialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("confirm.title")}</DialogTitle>
            <DialogDescription>
              {t("confirm.description", {
                date: confirm
                  ? formatDateTime(confirm.createdAt, locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                confirm &&
                start(async () => {
                  setError(null)
                  const r = await restoreInstanceBackupAction(confirm.id)
                  if (r.ok) finishRestore(r.data)
                  else {
                    setConfirm(null)
                    setError(r.error)
                  }
                })
              }
            >
              {pending ? t("restoring") : t("restore")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("upload.title")}</DialogTitle>
            <DialogDescription>
              {t.rich("upload.description", { code: (c) => <code>{c}</code> })}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              start(async () => {
                setError(null)
                const r = await restoreInstanceUploadAction(fd)
                if (r.ok) finishRestore(r.data)
                else {
                  setUploadOpen(false)
                  setError(r.error)
                }
              })
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="ib-file">{t("upload.file")}</Label>
              <Input
                id="ib-file"
                name="file"
                type="file"
                accept=".gz,application/gzip"
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? t("restoring") : t("restore")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
