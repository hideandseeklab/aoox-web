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
    { label: "Image", bytes: usage.imagesBytes, cls: "bg-primary" },
    { label: "Volume", bytes: usage.volumesBytes, cls: "bg-chart-2" },
    { label: "Build cache", bytes: usage.buildCacheBytes, cls: "bg-chart-4" },
    { label: "Container", bytes: usage.containersBytes, cls: "bg-chart-5" },
  ]
  const last = usage.lastCleanup

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disk Docker</CardTitle>
        <CardDescription>
          {gb(total)} dipakai Docker di host ini. Pembersihan malam (04:30)
          menghapus deployment lama melebihi riwayat tiap aplikasi, image tak
          terpakai, build cache, dan blob registry yang yatim.
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
              <dd className="ms-auto font-mono">{gb(p.bytes)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm">
          Bisa dibebaskan sekarang:{" "}
          <span className="font-mono">{gb(usage.reclaimableBytes)}</span>
          {usage.prunableDeployments > 0 &&
            ` · ${usage.prunableDeployments} deployment lama akan dipangkas`}
        </p>
        {usage.orphanVolumes.length > 0 && (
          <div className="rounded-md border border-dashed p-2 text-xs">
            <p className="text-muted-foreground">
              {usage.orphanVolumes.length} volume yatim (nama seperti milik
              aoox, tapi tidak ada lagi project/aplikasi yang punya) —
              hanya dihapus kalau &quot;Sekalian hapus volume yatim&quot; dicentang:
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
              {pending || usage.running
                ? "Membersihkan…"
                : "Bersihkan sekarang"}
            </Button>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={registryGc} onCheckedChange={setRegistryGc} />
              Sekalian GC registry lokal
            </label>
            {usage.orphanVolumes.length > 0 && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={pruneVolumes}
                  onCheckedChange={setPruneVolumes}
                />
                Sekalian hapus volume yatim
              </label>
            )}
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {last && (
          <p className="text-xs text-muted-foreground">
            Terakhir{" "}
            {new Date(last.startedAt).toLocaleString("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            : {last.deploymentsPruned} deployment, {last.imagesRemoved} image,{" "}
            {last.danglingImagesDeleted} dangling, {gb(last.reclaimedBytes)}{" "}
            dibebaskan, registry GC {last.registryGc}, cache BuildKit{" "}
            {last.buildkitCache}
            {last.volumesRemoved.length > 0 &&
              `, ${last.volumesRemoved.length} volume yatim dihapus`}
            {last.errors.length > 0 && (
              <>
                {" "}
                <Badge variant="destructive">{last.errors.length} error</Badge>
              </>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
