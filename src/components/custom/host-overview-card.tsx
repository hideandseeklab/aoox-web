import { Boxes, Cpu, MemoryStick } from "lucide-react"
import { useTranslations } from "next-intl"
import { StatCard } from "@/components/custom/stat-card"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  formatBytes,
  type HostOverview,
} from "@/features/monitoring/monitoring.entity"

/**
 * Dashboard card: what the API can see of the host through Docker. The host
 * filesystem itself is not visible from a container, so "disk" is Docker's
 * own usage (images, volumes, containers, build cache).
 */
export function HostOverviewCard({ host }: { host: HostOverview }) {
  const t = useTranslations("dashboard.host")
  const disk = host.disk
  const diskTotal =
    disk.imagesBytes +
    disk.volumesBytes +
    disk.containersBytes +
    disk.buildCacheBytes
  const managedMemPct =
    host.memoryTotalBytes > 0
      ? (host.managed.memoryBytes / host.memoryTotalBytes) * 100
      : 0
  const segments: Array<[label: string, bytes: number, className: string]> = [
    [t("segments.images"), disk.imagesBytes, "bg-primary"],
    [t("segments.volumes"), disk.volumesBytes, "bg-primary/70"],
    [t("segments.containers"), disk.containersBytes, "bg-primary/45"],
    [t("segments.buildCache"), disk.buildCacheBytes, "bg-primary/25"],
  ]

  return (
    <Card className="sm:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("summary", {
            os: host.operatingSystem,
            version: host.serverVersion,
            cpus: host.cpus,
            memory: formatBytes(host.memoryTotalBytes),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            variant="inset"
            icon={Boxes}
            label={t("aooxContainers")}
            value={String(host.managed.containers)}
            hint={t("aooxContainersHint", {
              running: host.containers.running,
              total: host.containers.total,
            })}
          />
          <StatCard
            variant="inset"
            icon={MemoryStick}
            label={t("aooxMemory")}
            value={formatBytes(host.managed.memoryBytes)}
            hint={t("aooxMemoryHint", { percent: managedMemPct.toFixed(1) })}
          />
          <StatCard
            variant="inset"
            icon={Cpu}
            label={t("aooxCpu")}
            value={`${host.managed.cpuPercent.toFixed(1)}%`}
            hint={t("aooxCpuHint", { max: host.cpus * 100, cpus: host.cpus })}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">{t("dockerDisk")}</span>
            <span className="font-medium tabular-nums">{formatBytes(diskTotal)}</span>
          </div>
          {/* Stacked meter: one hue, lighter steps per segment, 2px gaps. */}
          <div
            className="flex h-2 w-full gap-0.5 overflow-hidden rounded bg-muted"
            role="img"
            aria-label={segments
              .map(([l, b]) => `${l} ${formatBytes(b)}`)
              .join(", ")}
          >
            {segments.map(([label, bytes, cls]) =>
              bytes > 0 && diskTotal > 0 ? (
                <div
                  key={label}
                  className={`${cls} rounded-sm`}
                  style={{ width: `${(bytes / diskTotal) * 100}%` }}
                  title={`${label}: ${formatBytes(bytes)}`}
                />
              ) : null
            )}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {segments.map(([label, bytes, cls]) => (
              <li key={label} className="flex items-center gap-1.5">
                <span className={`inline-block size-2 rounded-sm ${cls}`} />
                {label}{" "}
                <span className="text-foreground tabular-nums">{formatBytes(bytes)}</span>
              </li>
            ))}
            <li>{t("imageCount", { count: host.images })}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
