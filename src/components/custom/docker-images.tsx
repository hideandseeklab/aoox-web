"use client"

import { Broom, Layers, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import {
  DockerEmpty,
  useAgo,
  useDockerQuery,
  matches,
} from "@/components/custom/docker-ui"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  pruneImagesAction,
  removeImageAction,
} from "@/features/docker/docker.actions"
import type { DockerImage } from "@/features/docker/docker.entity"
import { formatBytes } from "@/features/monitoring/monitoring.entity"

const shortId = (id: string) => id.replace(/^sha256:/, "").slice(0, 12)

/** Images of the chosen server; only ones no container uses (and aoox does not own) can be removed. */
export function DockerImages({
  images,
  serverId,
  isOwner,
}: {
  images: DockerImage[]
  serverId: string | null
  isOwner: boolean
}) {
  const t = useTranslations("docker")
  const ago = useAgo()
  const query = useDockerQuery()
  const rows = images.filter((i) =>
    matches(query, ...i.tags, shortId(i.id), ...i.usedByNames)
  )
  const dangling = images.filter((i) => i.dangling && i.usedBy === 0)
  const danglingBytes = dangling.reduce((n, i) => n + i.size, 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {isOwner && (
          <ConfirmDialog
            tone="neutral"
            trigger={
              <Button
                type="button"
                variant="outline"
                disabled={dangling.length === 0}
              >
                <Broom data-icon="inline-start" />
                {t("images.prune", { count: dangling.length })}
              </Button>
            }
            title={t("images.pruneTitle")}
            description={
              t.rich("images.pruneDescription", {
                b: (c) => <strong>{c}</strong>,
                count: dangling.length,
                size: formatBytes(danglingBytes),
              })
            }
            confirmLabel={t("images.pruneConfirm")}
            onConfirm={async () => {
              const r = await pruneImagesAction(serverId)
              if (!r.ok) return { ok: false, error: r.error }
              toast.success(
                t("images.pruned", {
                  count: r.data.deleted,
                  size: formatBytes(r.data.reclaimedBytes),
                })
              )
            }}
          />
        )}
      </div>
      {rows.length === 0 ? (
        <DockerEmpty icon={Layers}>
          {images.length === 0 ? t("images.empty") : t("images.noMatch")}
        </DockerEmpty>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>{t("images.size")}</TableHead>
                <TableHead>{t("images.created")}</TableHead>
                <TableHead>{t("images.usedBy")}</TableHead>
                <TableHead>{t("managedBy")}</TableHead>
                <TableHead className="text-end">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="max-w-72 whitespace-normal">
                    {i.tags.length > 0 ? (
                      i.tags.map((t) => (
                        <div key={t} className="truncate font-mono" title={t}>
                          {t}
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground">
                        {t("images.untagged")}
                      </div>
                    )}
                    <div className="font-mono text-muted-foreground">
                      {shortId(i.id)}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {formatBytes(i.size)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {ago(i.createdAt)}
                  </TableCell>
                  <TableCell className="max-w-48 whitespace-normal">
                    {i.usedBy === 0 ? (
                      <span className="text-muted-foreground">
                        {t("images.unused")}
                      </span>
                    ) : (
                      <span title={i.usedByNames.join(", ")}>
                        {t("images.containers", { count: i.usedBy })}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {i.managed ? (
                      <Badge
                        variant="outline"
                        title={t("images.aooxHint")}
                      >
                        {t("images.aooxImage")}
                      </Badge>
                    ) : i.protectedReason ? (
                      <Badge variant="outline" title={i.protectedReason}>
                        {t("images.protected")}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {isOwner &&
                        !i.managed &&
                        !i.protectedReason &&
                        i.usedBy === 0 && (
                          <RemoveImageButton image={i} serverId={serverId} />
                        )}
                    </div>
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

function RemoveImageButton({
  image,
  serverId,
}: {
  image: DockerImage
  serverId: string | null
}) {
  const t = useTranslations("docker")
  const label = image.tags[0] ?? shortId(image.id)
  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="outline" size="sm">
          <Trash2 data-icon="inline-start" />
          {t("remove")}
        </Button>
      }
      title={t("images.removeTitle", { name: label })}
      description={
        <span className="space-y-2">
          <span className="block">
            {t.rich("images.removeDescription", {
              b: (c) => <strong>{c}</strong>,
              code: (c) => <span className="font-mono">{c}</span>,
              id: shortId(image.id),
            })}
          </span>
          {image.tags.length > 0 ? (
            <span className="block max-h-40 overflow-y-auto rounded-md border bg-muted/40 p-2">
              {image.tags.map((t) => (
                <span key={t} className="block font-mono break-all">
                  {t}
                </span>
              ))}
            </span>
          ) : (
            <span className="block text-muted-foreground">
              {t.rich("images.removeNoTag", {
                code: (c) => <span className="font-mono">{c}</span>,
                id: shortId(image.id),
              })}
            </span>
          )}
        </span>
      }
      confirmLabel={t("remove")}
      onConfirm={async () => {
        const r = await removeImageAction(image.id, serverId)
        if (!r.ok) return { ok: false, error: r.error }
        toast.success(t("images.removed", { name: label }))
      }}
    />
  )
}
