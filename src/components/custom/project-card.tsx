import { Boxes, Database, Layers } from "lucide-react"
import Link from "next/link"
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
} from "@/features/project/project.entity"
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

/** Dot colour per observed status; anything unknown counts as inactive. */
function statusDot(status: string) {
  if (status === "running") return "bg-emerald-500"
  if (status === "error") return "bg-destructive"
  if (["building", "deploying", "creating"].includes(status))
    return "bg-amber-500 animate-pulse"
  return "bg-muted-foreground/40"
}

function InstanceRow({ instance }: { instance: ProjectInstance }) {
  const Icon = KIND_ICON[instance.kind]
  const active = instance.status === "running"
  return (
    <li className="flex items-center gap-2 text-sm">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{instance.name}</span>
      <span className="font-mono text-[11px] text-muted-foreground">
        {instance.engine ?? KIND_LABEL[instance.kind]}
      </span>
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          statusDot(instance.status)
        )}
        title={instance.status}
        aria-label={active ? "aktif" : instance.status}
      />
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
      <Card className="h-full transition-colors hover:bg-muted/50">
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
            <p className="text-sm text-muted-foreground">Belum ada instance</p>
          ) : (
            <>
              <ul className="space-y-1.5">
                {project.instances.map((i) => (
                  <InstanceRow key={`${i.kind}:${i.id}`} instance={i} />
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                {running}/{total} berjalan
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
