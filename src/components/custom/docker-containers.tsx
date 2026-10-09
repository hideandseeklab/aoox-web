"use client"

import { Container, FileText, Play, RotateCw, Square, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { LinkArrow } from "@/components/custom/arrows"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import {
  DockerEmpty,
  useAgo,
  useDockerQuery,
  matches,
} from "@/components/custom/docker-ui"
import { DockerLogsDialog } from "@/components/custom/docker-logs-dialog"
import { StatusDot } from "@/components/custom/status-dot"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  containerAction,
  removeContainerAction,
} from "@/features/docker/docker.actions"
import {
  type DockerContainer,
} from "@/features/docker/docker.entity"

function resourceHref(c: DockerContainer): string | null {
  const l = c.managed?.link
  if (!l) return null
  if (l.type === "application") return `/applications/${l.id}`
  if (l.type === "database") return `/databases/${l.id}`
  return `/compose/${l.id}`
}

function ports(c: DockerContainer): string {
  const seen = new Set<string>()
  for (const p of c.ports) {
    seen.add(
      p.publicPort
        ? `${p.publicPort}:${p.privatePort}/${p.type}`
        : `${p.privatePort}/${p.type}`
    )
  }
  return [...seen].join(", ") || "-"
}

/**
 * Containers of the chosen server. Containers aoox owns (panel, proxy, registry,
 * apps, databases, stacks...) are listed with a badge and a link to their own
 * page but get no stop/restart/remove here — the API refuses them too.
 */
export function DockerContainers({
  containers,
  serverId,
  isOwner,
}: {
  containers: DockerContainer[]
  serverId: string | null
  isOwner: boolean
}) {
  const t = useTranslations("docker")
  const ago = useAgo()
  const query = useDockerQuery()
  const [pending, start] = useTransition()
  const [logsFor, setLogsFor] = useState<DockerContainer | null>(null)
  const rows = containers.filter((c) => matches(query, c.name, c.image, c.id))

  const run = (c: DockerContainer, action: "start" | "stop" | "restart") =>
    start(async () => {
      const r = await containerAction(c.id, action, serverId)
      if (r.ok) toast.success(t("containers.actionDone", { name: c.name, action }))
      else toast.error(r.error)
    })

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <DockerEmpty icon={Container}>
          {containers.length === 0
            ? t("containers.empty")
            : t("containers.noMatch")}
        </DockerEmpty>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Fixed-width, centered dot column; the Container column drops its left padding so the gap is equal on both sides of the dot. */}
                <TableHead className="w-10 min-w-10 px-0 text-center">
                  <span className="sr-only">{t("containers.state")}</span>
                </TableHead>
                <TableHead className="ps-0">{t("containers.container")}</TableHead>
                <TableHead>{t("containers.status")}</TableHead>
                <TableHead>{t("managedBy")}</TableHead>
                <TableHead>{t("containers.port")}</TableHead>
                <TableHead>{t("containers.age")}</TableHead>
                <TableHead className="text-end">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const href = resourceHref(c)
                const running = c.state === "running"
                return (
                  <TableRow key={c.id}>
                    <TableCell className="w-10 min-w-10 px-0">
                      <div className="flex items-center justify-center">
                        <StatusDot status={c.state} />
                      </div>
                    </TableCell>
                    <TableCell className="max-w-64 ps-0">
                      <div className="truncate font-mono" title={c.name}>
                        {c.name}
                      </div>
                      <div
                        className="truncate font-mono text-muted-foreground"
                        title={c.image}
                      >
                        {c.image}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-muted-foreground">{c.status}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {c.managed ? (
                        <Badge
                          variant="outline"
                          title={
                            c.managed.kind === "panel"
                              ? t("managed.hintPanel")
                              : t("managed.hint", {
                                  kind: t(`managed.kinds.${c.managed.kind}`).toLowerCase(),
                                })
                          }
                        >
                          {t(`managed.kinds.${c.managed.kind}`)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-40 font-mono whitespace-normal">
                      {ports(c)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {ago(c.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setLogsFor(c)}
                        >
                          <FileText data-icon="inline-start" />
                          {t("containers.logs")}
                        </Button>
                        {c.managed ? (
                          href && (
                            <Button asChild variant="outline" size="sm">
                              <Link href={href}>
                                {t("containers.openPage")}
                                <LinkArrow />
                              </Link>
                            </Button>
                          )
                        ) : isOwner ? (
                          <>
                            {running ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={pending}
                                onClick={() => run(c, "stop")}
                              >
                                <Square data-icon="inline-start" />
                                {t("containers.stop")}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={pending}
                                onClick={() => run(c, "start")}
                              >
                                <Play data-icon="inline-start" />
                                {t("containers.start")}
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={pending}
                              onClick={() => run(c, "restart")}
                            >
                              <RotateCw data-icon="inline-start" />
                              {t("containers.restart")}
                            </Button>
                            <RemoveContainerButton
                              container={c}
                              serverId={serverId}
                            />
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <DockerLogsDialog
        container={logsFor}
        serverId={serverId}
        onClose={() => setLogsFor(null)}
      />
    </div>
  )
}

function RemoveContainerButton({
  container,
  serverId,
}: {
  container: DockerContainer
  serverId: string | null
}) {
  const t = useTranslations("docker")
  const [force, setForce] = useState(false)
  const running = container.state === "running"
  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="outline" size="sm">
          <Trash2 data-icon="inline-start" />
          {t("remove")}
        </Button>
      }
      title={t("containers.removeTitle", { name: container.name })}
      description={
        <span className="space-y-2">
          <span className="block">
            {t("containers.removeDescription")}
          </span>
          {running && (
            <label className="flex items-center gap-2">
              <Switch checked={force} onCheckedChange={setForce} />
              {t("containers.force")}
            </label>
          )}
        </span>
      }
      confirmLabel={t("remove")}
      onConfirm={async () => {
        const r = await removeContainerAction(container.id, force, serverId)
        if (!r.ok) return { ok: false, error: r.error }
        toast.success(t("containers.removed", { name: container.name }))
      }}
    />
  )
}
