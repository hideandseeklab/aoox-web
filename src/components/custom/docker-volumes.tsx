"use client"

import { HardDrive } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  DockerEmpty,
  useAgo,
  useDockerQuery,
  matches,
} from "@/components/custom/docker-ui"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { DockerVolume } from "@/features/docker/docker.entity"
import { formatBytes } from "@/features/monitoring/monitoring.entity"

/** Volumes of the chosen server, read only (removal stays in Disk Docker for aoox's orphans). */
export function DockerVolumes({ volumes }: { volumes: DockerVolume[] }) {
  const t = useTranslations("docker")
  const ago = useAgo()
  const query = useDockerQuery()
  const rows = volumes.filter((v) =>
    matches(query, v.name, v.driver, ...v.usedByNames)
  )
  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <DockerEmpty icon={HardDrive}>
          {volumes.length === 0 ? t("volumes.empty") : t("volumes.noMatch")}
        </DockerEmpty>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("volumes.volume")}</TableHead>
                <TableHead>{t("driver")}</TableHead>
                <TableHead>{t("volumes.size")}</TableHead>
                <TableHead>{t("volumes.created")}</TableHead>
                <TableHead>{t("usedByHeader")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((v) => (
                <TableRow key={v.name}>
                  <TableCell className="max-w-72">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="truncate font-mono" title={v.name}>
                        {v.name}
                      </span>
                      {v.managed && <Badge variant="outline">aoox</Badge>}
                      {v.orphan && <Badge variant="destructive">{t("volumes.orphan")}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{v.driver}</TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {v.size === null ? "-" : formatBytes(v.size)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {ago(v.createdAt)}
                  </TableCell>
                  <TableCell className="max-w-64 whitespace-normal">
                    {v.usedByNames.length === 0 ? (
                      <span className="text-muted-foreground">
                        {t("unused")}
                      </span>
                    ) : (
                      <span className="font-mono">
                        {v.usedByNames.join(", ")}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
