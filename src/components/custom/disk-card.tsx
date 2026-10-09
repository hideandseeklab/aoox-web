"use client"

import { Broom } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { runCleanupAction } from "@/features/maintenance/maintenance.actions"
import type { DiskUsage } from "@/features/maintenance/maintenance.entity"
import { formatDateTime } from "@/i18n/format"
import { useLocale, useTranslations } from "next-intl"

function gb(n: number) {
  if (n < 1024 ** 2) return `${Math.round(n / 1024)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(0)} MB`
  return `${(n / 1024 ** 3).toFixed(1)} GB`
}

/** Docker disk usage on the aoox host and the cleanup that runs nightly at 04:30. */
export function DiskCard({
  usage,
  canRun,
}: {
  usage: DiskUsage
  canRun: boolean
}) {
  const t = useTranslations("infra.disk")
  const locale = useLocale()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [registryGc, setRegistryGc] = useState(true)
  const [pruneVolumes, setPruneVolumes] = useState(false)
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("description", { size: gb(total) })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex h-2 w-full overflow-hidden rounded bg-muted">
          {parts.map((p) => (
            <div
              key={p.label}
              className={p.cls}
              style={{ width: `${total ? (p.bytes / total) * 100 : 0}%` }}
              title={`${p.label}: ${gb(p.bytes)}`}
            />
          ))}
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          {parts.map((p) => (
            <div key={p.label} className="flex items-center gap-2">
              <span className={`size-2 rounded-sm ${p.cls}`} />
              <dt className="text-muted-foreground">{p.label}</dt>
              <dd className="ms-auto font-mono tabular-nums">{gb(p.bytes)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs">
          {t("reclaimable")}{" "}
          <span className="font-mono">{gb(usage.reclaimableBytes)}</span>
          {usage.prunableDeployments > 0 &&
            ` · ${t("prunable", { count: usage.prunableDeployments })}`}
        </p>
        {usage.orphanVolumes.length > 0 && (
          <div className="rounded-md border border-dashed p-2 text-xs">
            <p className="text-muted-foreground">
              {t("orphans", { count: usage.orphanVolumes.length })}
            </p>
            <ul className="mt-1 space-y-0.5 font-mono">
              {usage.orphanVolumes.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </div>
        )}
        {canRun && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              disabled={pending || usage.running}
              onClick={() =>
                start(async () => {
                  setError(null)
                  const r = await runCleanupAction(registryGc, pruneVolumes)
                  if (!r.ok) setError(r.error)
                })
              }
            >
              <Broom data-icon="inline-start" />
              {pending || usage.running ? t("cleaning") : t("cleanNow")}
            </Button>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={registryGc} onCheckedChange={setRegistryGc} />
              {t("registryGc")}
            </label>
            {usage.orphanVolumes.length > 0 && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={pruneVolumes}
                  onCheckedChange={setPruneVolumes}
                />
                {t("pruneVolumes")}
              </label>
            )}
          </div>
        )}
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        {last && (
          <p className="text-xs text-muted-foreground">
            {t("last", {
              date: formatDateTime(last.startedAt, locale, {
                dateStyle: "medium",
                timeStyle: "short",
              }),
              deployments: last.deploymentsPruned,
              images: last.imagesRemoved,
              dangling: last.danglingImagesDeleted,
              reclaimed: gb(last.reclaimedBytes),
              registryGc: last.registryGc,
              buildkit: last.buildkitCache,
            })}
            {last.volumesRemoved.length > 0 &&
              `, ${t("lastVolumes", { count: last.volumesRemoved.length })}`}
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
      </CardContent>
    </Card>
  )
}
