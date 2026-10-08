"use client"

import {
  DockerEmpty,
  useDockerQuery,
  ago,
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
  const query = useDockerQuery()
  const rows = volumes.filter((v) =>
    matches(query, v.name, v.driver, ...v.usedByNames)
  )
  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <DockerEmpty>
          {volumes.length === 0
            ? "Belum ada volume di server ini."
            : "Tidak ada volume yang cocok."}
        </DockerEmpty>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Volume</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Ukuran</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead>Dipakai oleh</TableHead>
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
                      {v.orphan && <Badge variant="destructive">yatim</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{v.driver}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {v.size === null ? "-" : formatBytes(v.size)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {ago(v.createdAt)}
                  </TableCell>
                  <TableCell className="max-w-64 whitespace-normal">
                    {v.usedByNames.length === 0 ? (
                      <span className="text-muted-foreground">
                        tidak dipakai
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
