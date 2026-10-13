import type { LucideIcon } from "lucide-react"
import {
  Activity,
  ArrowRight,
  Boxes,
  Cpu,
  FolderKanban,
  MemoryStick,
  PowerOff,
} from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import type { ReactNode } from "react"
import { StatusDot } from "@/components/custom/status-dot"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  formatBytes,
  type HostOverview,
} from "@/features/monitoring/monitoring.entity"

/**
 * Dashboard overview: projects and, for owner/admin, what the API sees of the
 * host through Docker, in one card. Cells sit in a grid whose 1 px gaps show
 * the border colour, so the hairlines follow any column count (4 → 2×2 → 1)
 * without per-breakpoint border classes. Columns follow the card's own width
 * (container queries), so a collapsed or expanded sidebar both lay out right.
 *
 * Without host data (members, or Docker unreachable) the project figures get
 * a cell each (total, active, inactive) so the card never shows an empty
 * Host area. The host filesystem itself is not visible from a container, so
 * "disk" is Docker's own usage (images, volumes, containers, build cache).
 */
export function DashboardOverviewCard({
  total,
  active,
  host,
  hostUnavailable = false,
}: {
  total: number
  active: number
  host: HostOverview | null
  /** Owner/admin whose host request failed: say so in the header. */
  hostUnavailable?: boolean
}) {
  const t = useTranslations("dashboard")
  const inactive = Math.max(total - active, 0)

  const viewAll = (
    <Link
      href="/projects"
      className="-my-0.5 inline-flex shrink-0 items-center gap-1 rounded-sm text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
    >
      {t("stats.viewAll")}
      <ArrowRight aria-hidden className="size-3" />
    </Link>
  )

  return (
    <Card className="@container gap-0 py-0">
      <CardHeader className="border-b py-3">
        <CardTitle>{t("overview.title")}</CardTitle>
        {host ? (
          <CardDescription className="flex min-w-0 items-start gap-2">
            {/* One line tall, so the dot sits on the first line when the summary wraps. */}
            <span className="flex h-[1lh] items-center">
              <StatusDot status="running" label={t("overview.dockerReachable")} />
            </span>
            <span className="min-w-0">
              {t("host.summary", {
                os: host.operatingSystem,
                version: host.serverVersion,
                cpus: host.cpus,
                memory: formatBytes(host.memoryTotalBytes),
              })}
            </span>
          </CardDescription>
        ) : hostUnavailable ? (
          <CardDescription className="flex items-center gap-2">
            <span aria-hidden className="inline-flex"><StatusDot status="error" tone="error" label={t("overview.dockerUnreachable")} /></span>
            <span>{t("overview.dockerUnreachable")}</span>
          </CardDescription>
        ) : null}
      </CardHeader>

      {host ? (
        <div className="grid gap-px bg-border @md:grid-cols-2 @4xl:grid-cols-4">
          <Cell
            icon={FolderKanban}
            label={t("stats.projects")}
            aside={viewAll}
            value={total}
            caption={
              <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span title={t("stats.activeHint")} className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="inline-flex"><StatusDot status="running" tone={active > 0 ? "active" : "idle"} label={t("stats.activeProjects")} /></span>
                  {t("stats.activeCount", { count: active })}
                </span>
                <span title={t("stats.inactiveHint")} className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="inline-flex"><StatusDot status="stopped" tone={inactive > 0 ? "error" : "idle"} label={t("stats.inactiveProjects")} /></span>
                  {t("stats.inactiveCount", { count: inactive })}
                </span>
              </span>
            }
          />
          <Cell
            icon={Boxes}
            label={t("host.aooxContainers")}
            value={host.managed.containers}
            caption={t("host.aooxContainersHint", {
              running: host.containers.running,
              total: host.containers.total,
            })}
          />
          <Cell
            icon={MemoryStick}
            label={t("host.aooxMemory")}
            value={formatBytes(host.managed.memoryBytes)}
            caption={t("host.aooxMemoryHint", {
              percent: (host.memoryTotalBytes > 0
                ? (host.managed.memoryBytes / host.memoryTotalBytes) * 100
                : 0
              ).toFixed(1),
            })}
          />
          <Cell
            icon={Cpu}
            label={t("host.aooxCpu")}
            value={`${host.managed.cpuPercent.toFixed(1)}%`}
            caption={t("host.aooxCpuHint", {
              max: host.cpus * 100,
              cpus: host.cpus,
            })}
          />
        </div>
      ) : (
        <div className="grid gap-px bg-border @xl:grid-cols-3">
          <Cell
            icon={FolderKanban}
            label={t("stats.totalProjects")}
            aside={viewAll}
            value={total}
            caption={t("stats.totalHint")}
          />
          <Cell
            icon={Activity}
            label={t("stats.activeProjects")}
            dot={<span aria-hidden className="inline-flex"><StatusDot status="running" tone={active > 0 ? "active" : "idle"} label={t("stats.activeProjects")} /></span>}
            value={active}
            caption={t("stats.activeHint")}
          />
          <Cell
            icon={PowerOff}
            label={t("stats.inactiveProjects")}
            dot={<span aria-hidden className="inline-flex"><StatusDot status="stopped" tone={inactive > 0 ? "error" : "idle"} label={t("stats.inactiveProjects")} /></span>}
            value={inactive}
            caption={t("stats.inactiveHint")}
          />
        </div>
      )}

      {host && <DockerDisk host={host} />}
    </Card>
  )
}

/** One statistic: muted label row (icon, text, optional link), value, caption. */
function Cell({
  icon: Icon,
  label,
  aside,
  dot,
  value,
  caption,
}: {
  icon: LucideIcon
  label: string
  aside?: ReactNode
  dot?: ReactNode
  value: ReactNode
  caption: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-card px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Icon aria-hidden className="size-3.5 shrink-0" />
          <span className="min-w-0">{label}</span>
          {dot}
        </p>
        {aside}
      </div>
      <p className="text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <div className="text-xs text-muted-foreground tabular-nums">{caption}</div>
    </div>
  )
}

/** Card footer: stacked Docker disk meter, one hue in solid steps, legend under it. */
function DockerDisk({ host }: { host: HostOverview }) {
  const t = useTranslations("dashboard.host")
  const disk = host.disk
  const total =
    disk.imagesBytes +
    disk.volumesBytes +
    disk.containersBytes +
    disk.buildCacheBytes
  // Solid chart steps (not opacity) so the lightest one still reads on white;
  // the ramp is flipped in dark mode so the strongest step stays the brightest.
  const segments: Array<[label: string, bytes: number, className: string]> = [
    [t("segments.images"), disk.imagesBytes, "bg-chart-5 dark:bg-chart-1"],
    [t("segments.volumes"), disk.volumesBytes, "bg-chart-4 dark:bg-chart-2"],
    [t("segments.containers"), disk.containersBytes, "bg-chart-3 dark:bg-chart-3"],
    [t("segments.buildCache"), disk.buildCacheBytes, "bg-chart-2 dark:bg-chart-4"],
  ]

  return (
    <div className="space-y-2 border-t px-4 py-3">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{t("dockerDisk")}</span>
        <span className="text-muted-foreground tabular-nums">
          {t("imageCount", { count: host.images })}
          <span aria-hidden className="mx-1.5">·</span>
          <span className="font-medium text-foreground">{formatBytes(total)}</span>
        </span>
      </div>
      <div
        className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={segments
          .map(([l, b]) => `${l} ${formatBytes(b)}`)
          .join(", ")}
      >
        {segments.map(([label, bytes, cls]) =>
          bytes > 0 && total > 0 ? (
            <div
              key={label}
              className={`${cls} first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${(bytes / total) * 100}%` }}
              title={`${label}: ${formatBytes(bytes)}`}
            />
          ) : null
        )}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {segments.map(([label, bytes, cls]) => (
          <li key={label} className="flex items-center gap-1.5">
            <span aria-hidden className={`inline-block size-2 rounded-full ${cls}`} />
            {label}
            <span className="text-foreground tabular-nums">{formatBytes(bytes)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
