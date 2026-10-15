"use client"

import { Broom, HardDrive, ListTree, Trash2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { IconButton } from "@/components/custom/data-table"
import {
  removeOrphanContainerAction,
  runCleanupAction,
} from "@/features/maintenance/maintenance.actions"
import type {
  DiskUsage,
  OrphanContainer,
} from "@/features/maintenance/maintenance.entity"
import { formatDateTime } from "@/i18n/format"

function size(n: number) {
  if (n < 1024 ** 2) return `${Math.round(n / 1024)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(0)} MB`
  return `${(n / 1024 ** 3).toFixed(1)} GB`
}

/**
 * Docker disk usage of the aoox host, as one row under the Docker page title, with a
 * Details dialog (breakdown, orphan volumes, last report, cleanup options) and one
 * Clean now confirmation shared by the row and the dialog. Host only: the page renders
 * it only when no remote server is selected. `usage` is null when the API could not
 * read it; `loadError` is then shown as a muted line instead.
 */
export function DockerDiskStrip({
  usage,
  loadError,
  canRun,
}: {
  usage: DiskUsage | null
  loadError: string | null
  canRun: boolean
}) {
  const t = useTranslations("docker.disk")

  if (!usage) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-3 py-2 text-xs">
        <HardDrive className="size-4 shrink-0 text-muted-foreground" />
        <span className="font-medium">{t("title")}</span>
        <span className="text-muted-foreground">
          {t("loadError")}
          {loadError ? `: ${loadError}` : ""}
        </span>
      </div>
    )
  }
  return <DiskStrip usage={usage} canRun={canRun} />
}

function DiskStrip({ usage, canRun }: { usage: DiskUsage; canRun: boolean }) {
  const t = useTranslations("docker.disk")
  const locale = useLocale()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [registryGc, setRegistryGc] = useState(true)
  const [pruneVolumes, setPruneVolumes] = useState(false)
  const [pruneContainers, setPruneContainers] = useState(false)
  const [removing, setRemoving] = useState<OrphanContainer | null>(null)

  const orphans = usage.orphanVolumes.length
  const removeOrphans = pruneVolumes && orphans > 0
  const orphanContainers = usage.orphanContainers ?? []
  const containerCount = orphanContainers.length
  const removeContainers = pruneContainers && containerCount > 0
  const total =
    usage.imagesBytes +
    usage.containersBytes +
    usage.volumesBytes +
    usage.buildCacheBytes
  const parts = [
    { label: t("parts.image"), bytes: usage.imagesBytes, cls: "bg-primary" },
    { label: t("parts.volume"), bytes: usage.volumesBytes, cls: "bg-chart-2" },
    {
      label: t("parts.buildCache"),
      bytes: usage.buildCacheBytes,
      cls: "bg-chart-4",
    },
    {
      label: t("parts.container"),
      bytes: usage.containersBytes,
      cls: "bg-chart-5",
    },
  ]
  const last = usage.lastCleanup
  const busy = usage.running

  // Spans, so the strip can place the meter inside its line of text.
  const meter = (className: string) => (
    <span className={`overflow-hidden rounded bg-muted ${className}`}>
      {parts.map((p) => (
        <span
          key={p.label}
          className={`block ${p.cls}`}
          style={{ width: `${total ? (p.bytes / total) * 100 : 0}%` }}
          title={`${p.label}: ${size(p.bytes)}`}
        />
      ))}
    </span>
  )

  const cleanButton = (onClick: () => void, small = false) => (
    <Button size={small ? "sm" : "default"} disabled={busy} onClick={onClick}>
      <Broom data-icon="inline-start" />
      {busy ? t("cleaning") : t("cleanNow")}
    </Button>
  )

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2 text-xs">
        {/* One run of text, so a narrow screen wraps it at a word and the dot stays after the size. */}
        <div className="flex min-w-0 items-start gap-2">
          <HardDrive className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="min-w-0">
            <span className="font-medium">{t("title")}</span>{" "}
            <span className="font-mono tabular-nums">{size(total)}</span>{" "}
            {meter("mx-1 hidden h-1.5 w-24 align-middle sm:inline-flex")}
            <span className="text-muted-foreground">
              ·{" "}
              {t.rich("canFree", {
                size: size(usage.reclaimableBytes),
                mono: (c) => (
                  <span className="font-mono text-foreground tabular-nums">
                    {c}
                  </span>
                ),
              })}
            </span>
          </p>
        </div>
        <div className="ms-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDetailsOpen(true)}
          >
            <ListTree data-icon="inline-start" />
            {t("details")}
          </Button>
          {canRun && cleanButton(() => setConfirmOpen(true), true)}
        </div>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>
              {t("description", { size: size(total) })}
            </DialogDescription>
          </DialogHeader>
          <div className="-mx-4 min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-0.5 text-xs">
            {meter("flex h-2 w-full")}
            <dl className="grid grid-cols-1 gap-x-6 gap-y-1 min-[420px]:grid-cols-2">
              {parts.map((p) => (
                <div key={p.label} className="flex items-center gap-2">
                  <span className={`size-2 shrink-0 rounded-sm ${p.cls}`} />
                  <dt className="text-muted-foreground">{p.label}</dt>
                  <dd className="ms-auto font-mono tabular-nums">
                    {size(p.bytes)}
                  </dd>
                </div>
              ))}
            </dl>
            <p>
              {t("reclaimable")}{" "}
              <span className="font-mono">{size(usage.reclaimableBytes)}</span>
              {usage.prunableDeployments > 0 &&
                ` · ${t("prunable", { count: usage.prunableDeployments })}`}
            </p>
            {orphans > 0 && (
              <div className="rounded-md border border-dashed p-2">
                <p className="text-muted-foreground">
                  {t("orphans", { count: orphans })}
                </p>
                <ul className="mt-1 space-y-0.5 font-mono [overflow-wrap:anywhere]">
                  {usage.orphanVolumes.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
              </div>
            )}
            {containerCount > 0 && (
              <div className="rounded-md border border-dashed p-2">
                <p className="text-muted-foreground">
                  {t("orphanContainers", { count: containerCount })}
                </p>
                <ul className="mt-1 space-y-1">
                  {orphanContainers.map((c) => (
                    <li key={c.id} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                        <span className="font-mono">{c.name}</span>{" "}
                        <span className="text-muted-foreground">
                          · {t(`containerKinds.${c.kind}`)}
                        </span>
                      </span>
                      <Badge
                        variant={
                          c.state === "running" ? "default" : "secondary"
                        }
                      >
                        {c.state}
                      </Badge>
                      {canRun && (
                        <IconButton
                          label={t("removeContainerAria", { name: c.name })}
                          onClick={() => {
                            setDetailsOpen(false)
                            setRemoving(c)
                          }}
                        >
                          <Trash2 />
                        </IconButton>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {canRun && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <Switch
                    checked={registryGc}
                    onCheckedChange={setRegistryGc}
                  />
                  {t("registryGc")}
                </label>
                {orphans > 0 && (
                  <label className="flex items-center gap-2 text-muted-foreground">
                    <Switch
                      checked={pruneVolumes}
                      onCheckedChange={setPruneVolumes}
                    />
                    {t("pruneVolumes")}
                  </label>
                )}
                {containerCount > 0 && (
                  <label className="flex items-center gap-2 text-muted-foreground">
                    <Switch
                      checked={pruneContainers}
                      onCheckedChange={setPruneContainers}
                    />
                    {t("pruneContainers")}
                  </label>
                )}
              </div>
            )}
            {last && (
              <p className="text-muted-foreground">
                {t("last", {
                  date: formatDateTime(last.startedAt, locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                  deployments: last.deploymentsPruned,
                  images: last.imagesRemoved,
                  dangling: last.danglingImagesDeleted,
                  reclaimed: size(last.reclaimedBytes),
                  registryGc: last.registryGc,
                  buildkit: last.buildkitCache,
                })}
                {last.volumesRemoved.length > 0 &&
                  `, ${t("lastVolumes", { count: last.volumesRemoved.length })}`}
                {(last.containersRemoved?.length ?? 0) > 0 &&
                  `, ${t("lastContainers", { count: last.containersRemoved?.length ?? 0 })}`}
                {last.errors.length > 0 && (
                  <>
                    {" "}
                    <Badge variant="destructive">
                      {t("errors", { count: last.errors.length })}
                    </Badge>
                  </>
                )}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              {t("close")}
            </Button>
            {canRun &&
              cleanButton(() => {
                // One dialog at a time: the confirmation replaces the details.
                setDetailsOpen(false)
                setConfirmOpen(true)
              })}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canRun && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          tone="neutral"
          title={t("confirm.title")}
          description={t("confirm.description", {
            registryGc: registryGc ? "yes" : "no",
            volumes: removeOrphans ? orphans : 0,
            containers: removeContainers ? containerCount : 0,
          })}
          confirmLabel={t("cleanNow")}
          onConfirm={async () => {
            const r = await runCleanupAction(
              registryGc,
              removeOrphans,
              removeContainers
            )
            return r.ok ? { ok: true } : { ok: false, error: r.error }
          }}
        />
      )}

      {canRun && (
        <ConfirmDialog
          open={removing !== null}
          onOpenChange={(o) => {
            if (!o) setRemoving(null)
          }}
          title={t("removeContainer.title")}
          description={t("removeContainer.description", {
            name: removing?.name ?? "",
          })}
          confirmLabel={t("removeContainer.confirm")}
          onConfirm={async () => {
            if (!removing) return
            const r = await removeOrphanContainerAction(removing.id)
            return r.ok ? { ok: true } : { ok: false, error: r.error }
          }}
        />
      )}
    </>
  )
}
