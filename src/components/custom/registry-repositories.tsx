"use client"

import { ChevronDown, ChevronRight, ImageOff, Trash2 } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  deleteRepositoryAction,
  deleteTagAction,
  fetchRepositoryUsageAction,
  fetchTagsAction,
} from "@/features/registry/registry.actions"
import type {
  RepositorySummary,
  RepositoryUsage,
  Tag,
} from "@/features/registry/registry.entity"

function formatBytes(n: number | null) {
  if (n === null) return "—"
  const units = ["B", "KB", "MB", "GB"]
  let v = n
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function RegistryRepositories({
  registryId,
  repositories,
  canManage,
}: {
  registryId: string
  repositories: RepositorySummary[]
  canManage: boolean
}) {
  const [repos, setRepos] = useState(repositories)

  if (repos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Belum ada image. Push pertama:{" "}
        <code>docker push &lt;registry&gt;/&lt;nama&gt;:&lt;tag&gt;</code>
      </div>
    )
  }
  return (
    <div className="divide-y rounded-lg border">
      {repos.map((repo) => (
        <RepositoryRow
          key={repo.name}
          registryId={registryId}
          repo={repo}
          canManage={canManage}
          onImageDeleted={() =>
            setRepos((rs) => rs.filter((r) => r.name !== repo.name))
          }
        />
      ))}
    </div>
  )
}

function RepositoryRow({
  registryId,
  repo,
  canManage,
  onImageDeleted,
}: {
  registryId: string
  repo: RepositorySummary
  canManage: boolean
  onImageDeleted: () => void
}) {
  const [open, setOpen] = useState(false)
  const [tags, setTags] = useState<Tag[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [toDelete, setToDelete] = useState<Tag | null>(null)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [usage, setUsage] = useState<RepositoryUsage[] | null>(null)
  const [imagePending, startImage] = useTransition()

  const openImageDialog = () => {
    setImageDialogOpen(true)
    setUsage(null)
    startImage(async () => {
      const r = await fetchRepositoryUsageAction(registryId, repo.name)
      if (r.ok) setUsage(r.data)
    })
  }

  const confirmDeleteImage = () =>
    startImage(async () => {
      const id = toast.loading(`Menghapus image ${repo.name}…`)
      const r = await deleteRepositoryAction(registryId, repo.name, true)
      if (r.ok) {
        toast.success(`Image ${repo.name} dihapus`, { id })
        setImageDialogOpen(false)
        onImageDeleted()
      } else {
        toast.error(r.error, { id })
      }
    })

  const load = () =>
    start(async () => {
      const r = await fetchTagsAction(registryId, repo.name)
      if (r.ok) setTags(r.data)
      else setError(r.error)
    })

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && tags === null) load()
  }

  const sharedDigest = (tag: Tag) =>
    (tags ?? []).filter((t) => t.digest === tag.digest && t.name !== tag.name)

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3 hover:bg-muted/50">
        <button
          type="button"
          onClick={toggle}
          className="flex flex-1 items-center gap-2 text-left text-sm"
        >
          {open ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
          <span className="font-mono font-medium">{repo.name}</span>
        </button>
        <span className="text-xs text-muted-foreground">
          {repo.tagCount} tag
        </span>
        {canManage && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Hapus image ${repo.name}`}
            onClick={openImageDialog}
          >
            <ImageOff />
          </Button>
        )}
      </div>
      {open && (
        <div className="border-t bg-muted/20 px-4 py-2">
          {error && (
            <p className="py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {tags === null && !error ? (
            <p className="py-2 text-sm text-muted-foreground">Memuat…</p>
          ) : tags && tags.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              {canManage
                ? 'Tidak ada tag (manifest sudah dihapus). Pakai tombol "Hapus image" untuk membuang repo ini sepenuhnya dari katalog.'
                : "Tidak ada tag (manifest sudah dihapus)."}
            </p>
          ) : (
            tags && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead>Digest</TableHead>
                    <TableHead className="text-end">Ukuran</TableHead>
                    {canManage && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.map((tag) => (
                    <TableRow key={tag.name}>
                      <TableCell className="font-mono">{tag.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {tag.digest.replace("sha256:", "").slice(0, 12)}
                      </TableCell>
                      <TableCell className="text-end">
                        {formatBytes(tag.size)}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Hapus tag ${tag.name}`}
                            onClick={() => setToDelete(tag)}
                          >
                            <Trash2 />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}
        </div>
      )}

      <Dialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus tag {toDelete?.name}?</DialogTitle>
            <DialogDescription>
              Registry menghapus <em>manifest</em>-nya, bukan hanya nama tag.
              {toDelete && sharedDigest(toDelete).length > 0 && (
                <>
                  {" "}
                  Tag berikut menunjuk manifest yang sama dan{" "}
                  <span className="font-medium text-foreground">
                    ikut terhapus
                  </span>
                  :{" "}
                  <code>
                    {sharedDigest(toDelete)
                      .map((t) => t.name)
                      .join(", ")}
                  </code>
                  .
                </>
              )}{" "}
              Ruang disk baru kembali setelah garbage collect.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  if (!toDelete) return
                  const r = await deleteTagAction(
                    registryId,
                    repo.name,
                    toDelete.name
                  )
                  if (!r.ok) {
                    setError(r.error)
                    return
                  }
                  setToDelete(null)
                  const refreshed = await fetchTagsAction(registryId, repo.name)
                  if (refreshed.ok) setTags(refreshed.data)
                })
              }
            >
              {pending ? "Menghapus…" : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={imageDialogOpen}
        onOpenChange={(o) => !imagePending && setImageDialogOpen(o)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus image {repo.name}?</DialogTitle>
            <DialogDescription>
              Menghapus repo ini sepenuhnya dari katalog: semua{" "}
              {repo.tagCount} tag dan manifest-nya, foldernya di storage, lalu
              garbage collect otomatis. Registry di-restart singkat agar cache
              blob-nya ikut bersih — push ulang dengan nama yang sama tetap
              bisa dilakukan setelahnya. Tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          {usage === null ? (
            <p className="text-sm text-muted-foreground">
              Memeriksa pemakaian…
            </p>
          ) : usage.length > 0 ? (
            <p className="text-sm text-destructive">
              Dipakai oleh {usage.length} aplikasi:{" "}
              <span className="font-medium">
                {usage.map((u) => u.applicationName).join(", ")}
              </span>
              . Rollback atau redeploy tanpa build ke image itu akan gagal
              setelah dihapus.
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={imagePending}
              onClick={() => setImageDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={imagePending || usage === null}
              onClick={confirmDeleteImage}
            >
              {imagePending ? "Menghapus…" : "Hapus image"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
