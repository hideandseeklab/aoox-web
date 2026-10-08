"use client"

import { Broom, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import {
  DockerEmpty,
  useDockerQuery,
  ago,
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
                Bersihkan dangling ({dangling.length})
              </Button>
            }
            title="Bersihkan image dangling?"
            description={
              <>
                Ini menghapus <strong>semua</strong> image dangling (tanpa tag
                dan tidak dipakai container) di server ini, bukan hanya milik
                aoox — sekitar {dangling.length} image,{" "}
                {formatBytes(danglingBytes)}. Jumlah sebenarnya bisa lebih
                sedikit bila ada image yang masih menjadi induk image lain.
              </>
            }
            confirmLabel="Bersihkan"
            onConfirm={async () => {
              const r = await pruneImagesAction(serverId)
              if (!r.ok) return { ok: false, error: r.error }
              toast.success(
                `${r.data.deleted} image dangling dihapus, ${formatBytes(r.data.reclaimedBytes)} dibebaskan`
              )
            }}
          />
        )}
      </div>
      {rows.length === 0 ? (
        <DockerEmpty>
          {images.length === 0
            ? "Belum ada image di server ini."
            : "Tidak ada image yang cocok."}
        </DockerEmpty>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Ukuran</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead>Dipakai</TableHead>
                <TableHead>Managed by aoox</TableHead>
                <TableHead className="text-end">Aksi</TableHead>
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
                        (tanpa tag, dangling)
                      </div>
                    )}
                    <div className="font-mono text-muted-foreground">
                      {shortId(i.id)}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatBytes(i.size)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {ago(i.createdAt)}
                  </TableCell>
                  <TableCell className="max-w-48 whitespace-normal">
                    {i.usedBy === 0 ? (
                      <span className="text-muted-foreground">
                        tidak dipakai
                      </span>
                    ) : (
                      <span title={i.usedByNames.join(", ")}>
                        {i.usedBy} container
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {i.managed ? (
                      <Badge
                        variant="outline"
                        title="Image milik aoox (helper, panel, atau rollback). Bersihkan lewat Disk Docker."
                      >
                        Image aoox
                      </Badge>
                    ) : i.protectedReason ? (
                      <Badge variant="outline" title={i.protectedReason}>
                        dilindungi
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
  const label = image.tags[0] ?? shortId(image.id)
  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="outline" size="sm">
          <Trash2 data-icon="inline-start" />
          Hapus
        </Button>
      }
      title={`Hapus image ${label}?`}
      description={
        <span className="space-y-2">
          <span className="block">
            Penghapusan berlaku per ID image (
            <span className="font-mono">{shortId(image.id)}</span>), jadi{" "}
            <strong>semua tag</strong> image ini ikut terhapus dari server ini.
            Tarik lagi dari registry bila dibutuhkan.
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
              Image ini tanpa tag (
              <span className="font-mono">{shortId(image.id)}</span>).
            </span>
          )}
        </span>
      }
      confirmLabel="Hapus"
      onConfirm={async () => {
        const r = await removeImageAction(image.id, serverId)
        if (!r.ok) return { ok: false, error: r.error }
        toast.success(`${label} dihapus`)
      }}
    />
  )
}
