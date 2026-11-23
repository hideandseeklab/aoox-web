"use client"

import {
  Archive,
  CircleCheck,
  CircleMinus,
  Cloud,
  Download,
  HardDriveDownload,
  Loader2,
  RotateCcw,
  TriangleAlert,
  Upload,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { DeleteBackupButton } from "@/components/custom/delete-backup-button"
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
import { ScheduleTimeZoneHint } from "@/components/custom/schedule-time-zone"
import { usePendingRow } from "@/hooks/use-pending-row"
import { useLocale, useTranslations } from "next-intl"

const INCLUDED = [
  "accounts",
  "projects",
  "variables",
  "integrations",
  "history",
] as const
const EXCLUDED = ["databases", "volumes", "runtime", "proxy", "keys"] as const

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
 * Two columns at `lg` (same grid as the project page): the backup card on
 * the left, the schedule card on the right; stacked below `lg`.
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
  // A manual backup in flight: a placeholder row holds the new row's place
  // (the buttons sit below the list), so nothing moves when it lands.
  const placeholder = usePendingRow(backups)
  const showPlaceholder = placeholder.showPlaceholder
  const [scheduleError, setScheduleError] = useState<string | null>(null)
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

  // Errors go to a toast so nothing in the card moves under the pointer.
  // `begin` runs before the transition: state set inside an async action
  // only commits when the action ends, which is too late for a placeholder.
  const backUpNow = () => {
    placeholder.begin(undefined)
    start(async () => {
      const r = await createInstanceBackupAction()
      if (r.ok) {
        placeholder.landed(r.data.id)
      } else {
        placeholder.cancel()
        toast.error(r.error ?? t("failed"))
      }
      router.refresh()
    })
  }

  const saveSchedule = () =>
    start(async () => {
      setScheduleError(null)
      const r = await updateInstanceBackupSettingsAction({
        backupCron: effectiveCron || null,
        backupKeep: Math.max(1, Number(keep) || 1),
        destinationId: destination === "local" ? null : destination,
      })
      if (!r.ok) setScheduleError(r.error ?? t("failed"))
    })

  const code = (c: React.ReactNode) => <code>{c}</code>

  const finishRestore = (r: RestoreReport) => {
    setConfirm(null)
    setUploadOpen(false)
    setReport(r)
    router.refresh()
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-medium">
                <CircleCheck className="size-3.5 text-primary" />
                {t("included.title")}
              </p>
              <ul className="list-disc space-y-1 ps-5 text-xs text-muted-foreground">
                {INCLUDED.map((k) => (
                  <li key={k}>{t(`included.${k}`)}</li>
                ))}
              </ul>
              <p className="ps-5 text-xs text-muted-foreground">
                {t("included.encrypted")}
              </p>
            </div>
            <div className="min-w-0 space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-medium">
                <CircleMinus className="size-3.5 text-muted-foreground" />
                {t("excluded.title")}
              </p>
              <ul className="list-disc space-y-1 ps-5 text-xs text-muted-foreground">
                {EXCLUDED.map((k) => (
                  <li key={k}>{t.rich(`excluded.${k}`, { code })}</li>
                ))}
              </ul>
            </div>
          </div>

          <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
            <TriangleAlert />
            <AlertDescription className="text-amber-700/90 dark:text-amber-400/90">
              {t.rich("keepKeys", { code })}
            </AlertDescription>
          </Alert>

          {backups.length === 0 && !showPlaceholder ? (
            <EmptyState icon={Archive} compact>
              {t("empty")}
            </EmptyState>
          ) : (
            <ul className="divide-y rounded-md border text-xs">
              {showPlaceholder && (
                <li
                  aria-busy="true"
                  className="flex items-center gap-2 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground">
                        {t("creating")}
                      </span>
                      <Badge variant="secondary">{t("status.running")}</Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">—</p>
                  </div>
                  {/* Same height as a real row (its icon buttons). */}
                  <span aria-hidden className="size-6 shrink-0" />
                </li>
              )}
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
                        {t(`status.${b.status}`)}
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
                      {b.local === false && b.status === "success" && (
                        <Badge variant="outline">{t("onlyOnS3")}</Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground tabular-nums">
                      {formatBytes(b.sizeBytes)} ·{" "}
                      {t("rows", { count: b.rowCount })} ·{" "}
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
                  <DeleteBackupButton
                    filename={b.filename}
                    destinationId={b.destinationId}
                    remoteKey={b.remoteKey}
                    disabled={pending}
                    onDelete={() => deleteInstanceBackupAction(b.id)}
                  />
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setUploadOpen(true)}
            >
              <Upload data-icon="inline-start" />
              {t("restoreFromFile")}
            </Button>
            {/* The label stays while it runs; the icon turns into a spinner. */}
            <Button size="sm" disabled={pending} onClick={backUpNow}>
              {showPlaceholder ? (
                <Loader2
                  data-icon="inline-start"
                  className="motion-safe:animate-spin"
                />
              ) : (
                <HardDriveDownload data-icon="inline-start" />
              )}
              {t("backupNow")}
            </Button>
          </div>
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
                    const r = await restoreInstanceBackupAction(confirm.id)
                    if (r.ok) finishRestore(r.data)
                    else {
                      setConfirm(null)
                      toast.error(r.error)
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
                {t.rich("upload.description", {
                  code: (c) => <code>{c}</code>,
                })}
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                start(async () => {
                  const r = await restoreInstanceUploadAction(fd)
                  if (r.ok) finishRestore(r.data)
                  else {
                    setUploadOpen(false)
                    toast.error(r.error)
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

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>{t("schedule")}</CardTitle>
          <CardDescription>{t("scheduleDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              saveSchedule()
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="ib-preset">{t("schedule")}</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger id="ib-preset" className="w-full">
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
              <div className="space-y-1.5">
                <Label htmlFor="ib-cron">{t("cron")}</Label>
                <Input
                  id="ib-cron"
                  value={customCron}
                  onChange={(e) => setCustomCron(e.target.value)}
                  placeholder="30 1 * * *"
                  className="font-mono"
                />
              </div>
            )}
            {mode !== "off" && <ScheduleTimeZoneHint />}
            <div className="space-y-1.5">
              <Label htmlFor="ib-keep">{t("keep")}</Label>
              <Input
                id="ib-keep"
                type="number"
                min={1}
                max={365}
                value={keep}
                onChange={(e) => setKeep(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ib-dest">{t("destination")}</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger id="ib-dest" className="w-full">
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
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={pending}>
                {t("saveSchedule")}
              </Button>
            </div>
            {scheduleError && (
              <p className="text-right text-xs text-destructive" role="alert">
                {scheduleError}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
