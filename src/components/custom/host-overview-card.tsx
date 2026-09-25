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
    ["Image", disk.imagesBytes, "bg-primary"],
    ["Volume", disk.volumesBytes, "bg-primary/70"],
    ["Container", disk.containersBytes, "bg-primary/45"],
    ["Build cache", disk.buildCacheBytes, "bg-primary/25"],
  ]

  return (
    <Card className="sm:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle>Host</CardTitle>
        <CardDescription>
          {host.operatingSystem} · Docker {host.serverVersion} · {host.cpus} CPU
          · {formatBytes(host.memoryTotalBytes)} RAM
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label="Container aoox"
            value={String(host.managed.containers)}
            hint={`${host.containers.running} berjalan dari ${host.containers.total} di host`}
          />
          <Stat
            label="Memori dipakai container aoox"
            value={formatBytes(host.managed.memoryBytes)}
            hint={`${managedMemPct.toFixed(1)}% dari RAM host`}
          />
          <Stat
            label="CPU container aoox"
            value={`${host.managed.cpuPercent.toFixed(1)}%`}
            hint={`dari ${host.cpus * 100}% (${host.cpus} core)`}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">Disk Docker</span>
            <span className="font-medium">{formatBytes(diskTotal)}</span>
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
                <span className="text-foreground">{formatBytes(bytes)}</span>
              </li>
            ))}
            <li>{host.images} image</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
