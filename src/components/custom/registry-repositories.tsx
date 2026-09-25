"use client"

import { ChevronDown, ChevronRight, Trash2 } from "lucide-react"
import { useState, useTransition } from "react"
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
  deleteTagAction,
  fetchTagsAction,
} from "@/features/registry/registry.actions"
import type {
  RepositorySummary,
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
  if (repositories.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Belum ada image. Push pertama:{" "}
        <code>docker push &lt;registry&gt;/&lt;nama&gt;:&lt;tag&gt;</code>
      </div>
    )
  }
  return (
    <div className="divide-y rounded-lg border">
      {repositories.map((repo) => (
        <RepositoryRow
          key={repo.name}
          registryId={registryId}
          repo={repo}
          canManage={canManage}
        />
      ))}
    </div>
  )
}

function RepositoryRow({
  registryId,
  repo,
  canManage,
}: {
  registryId: string
  repo: RepositorySummary
  canManage: boolean
}) {
  const [open, setOpen] = useState(false)
  const [tags, setTags] = useState<Tag[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [toDelete, setToDelete] = useState<Tag | null>(null)

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
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-muted/50"
      >
        {open ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
        <span className="font-mono font-medium">{repo.name}</span>
        <span className="ms-auto text-xs text-muted-foreground">
          {repo.tagCount} tag
        </span>
      </button>
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
              Tidak ada tag (manifest sudah dihapus, jalankan garbage collect).
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
    </div>
  )
}
