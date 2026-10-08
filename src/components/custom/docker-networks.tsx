"use client"

import {
  DockerEmpty,
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
import type { DockerNetwork } from "@/features/docker/docker.entity"

/** Networks of the chosen server, read only. */
export function DockerNetworks({ networks }: { networks: DockerNetwork[] }) {
  const query = useDockerQuery()
  const rows = networks.filter((n) =>
    matches(query, n.name, n.driver, n.subnet ?? undefined, ...n.usedByNames)
  )
  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <DockerEmpty>
          {networks.length === 0
            ? "Belum ada network di server ini."
            : "Tidak ada network yang cocok."}
        </DockerEmpty>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Network</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Subnet</TableHead>
                <TableHead>Dipakai oleh</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="max-w-64">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="truncate font-mono" title={n.name}>
                        {n.name}
                      </span>
                      {n.builtin && <Badge variant="secondary">bawaan</Badge>}
                      {n.managed && <Badge variant="outline">aoox</Badge>}
                      {n.internal && (
                        <Badge variant="secondary">internal</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {n.driver} · {n.scope}
                  </TableCell>
                  <TableCell className="font-mono whitespace-nowrap">
                    {n.subnet ?? "-"}
                  </TableCell>
                  <TableCell className="max-w-72 whitespace-normal">
                    {n.usedByNames.length === 0 ? (
                      <span className="text-muted-foreground">
                        tidak dipakai
                      </span>
                    ) : (
                      <span className="font-mono">
                        {n.usedByNames.join(", ")}
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
