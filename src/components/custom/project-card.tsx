import { Boxes, Database, Layers } from "lucide-react"
import Link from "next/link"
import { EngineIcon } from "@/components/custom/brand-icon"
import { StatusDot } from "@/components/custom/status-dot"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type {
  ProjectInstance,
  ProjectListItem,
  ProjectResourceUsageSummary,
} from "@/features/project/project.entity"
import { formatBytes } from "@/features/monitoring/monitoring.entity"
import { cn } from "@/lib/utils"

const KIND_ICON = {
  application: Boxes,
  database: Database,
  compose: Layers,
} as const

const KIND_LABEL = {
  application: "aplikasi",
  database: "database",
  compose: "stack",
} as const

/** "CPU 12% · RAM 340 MB · ↓2.1 MB/s ↑0.4 MB/s" — nothing running = no line at all. */
function ResourceUsageLine({ usage }: { usage: ProjectResourceUsageSummary }) {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
      <span>
        CPU{" "}
        {usage.cpuPercent === null ? "–" : `${usage.cpuPercent.toFixed(1)}%`}
      </span>
      <span aria-hidden>·</span>
      <span>RAM {formatBytes(usage.memoryBytes)}</span>
      <span aria-hidden>·</span>
      <span>
        ↓
        {usage.netRxBytesPerSec === null
          ? "–"
          : `${formatBytes(usage.netRxBytesPerSec)}/s`}{" "}
        ↑
        {usage.netTxBytesPerSec === null
          ? "–"
          : `${formatBytes(usage.netTxBytesPerSec)}/s`}
      </span>
    </p>
  )
}

function InstanceRow({ instance }: { instance: ProjectInstance }) {
  const Icon = KIND_ICON[instance.kind]
  return (
    <li className="flex items-center gap-2 text-xs">
      {instance.kind === "database" && instance.engine ? (
        <EngineIcon
          engine={instance.engine}
          className="text-muted-foreground"
        />
      ) : (
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      )}
      <span className="min-w-0 flex-1 truncate">{instance.name}</span>
      {instance.deploying && (
        <Badge
          variant="outline"
          className="shrink-0 border-amber-500/40 px-1.5 py-0 text-[10px] text-amber-500"
        >
          deploy…
        </Badge>
      )}
      <span className="font-mono text-[11px] text-muted-foreground">
        {instance.engine ?? KIND_LABEL[instance.kind]}
      </span>
      <StatusDot status={instance.deploying ? "deploying" : instance.status} />
    </li>
  )
}

/**
 * Project overview card: name, description, and every deployable in it
 * with a status dot, so the list page shows what is running without
 * opening each project.
 */
export function ProjectCard({ project }: { project: ProjectListItem }) {
  const running = project.instances.filter((i) => i.status === "running").length
  const total = project.instances.length
  const active = running > 0

  return (
    <Link href={`/projects/${project.id}`} className="block">
      <Card className="h-full motion-safe:transition-colors hover:bg-muted/50">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="truncate">{project.name}</CardTitle>
            {total > 0 && (
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0",
                  active
                    ? "border-emerald-500/40 text-emerald-500"
                    : "text-muted-foreground"
                )}
              >
                {active ? "active" : "inactive"}
              </Badge>
            )}
          </div>
          <CardDescription className="line-clamp-2">
            {project.description || "Tanpa deskripsi"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <p className="text-xs text-muted-foreground">Belum ada instance</p>
          ) : (
            <>
              <ul className="space-y-1.5">
                {project.instances.map((i) => (
                  <InstanceRow key={`${i.kind}:${i.id}`} instance={i} />
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground tabular-nums">
                {running}/{total} berjalan
              </p>
              {project.resourceUsage && (
                <ResourceUsageLine usage={project.resourceUsage} />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
