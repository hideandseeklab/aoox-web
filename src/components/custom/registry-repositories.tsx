"use client"

import { ChevronDown, ChevronRight, ImageOff, Package, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/components/custom/empty-state"
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
  const t = useTranslations("registry.repositories")
  const [repos, setRepos] = useState(repositories)

  if (repos.length === 0) {
    return (
      <EmptyState icon={Package}>
        {t.rich("empty", { code: (c) => <code>{c}</code> })}
      </EmptyState>
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
  const t = useTranslations("registry.repositories")
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
      const id = toast.loading(t("deletingImage", { name: repo.name }))
      const r = await deleteRepositoryAction(registryId, repo.name, true)
      if (r.ok) {
        toast.success(t("imageDeleted", { name: repo.name }), { id })
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
    (tags ?? []).filter((x) => x.digest === tag.digest && x.name !== tag.name)

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2 hover:bg-muted/50">
        <button
          type="button"
          onClick={toggle}
          className="flex flex-1 items-center gap-2 text-left text-xs"
        >
          {open ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
          <span className="font-mono font-medium">{repo.name}</span>
        </button>
        <span className="text-xs text-muted-foreground">
          {t("tagCount", { count: repo.tagCount })}
        </span>
        {canManage && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("deleteImageLabel", { name: repo.name })}
            onClick={openImageDialog}
          >
            <ImageOff />
          </Button>
        )}
      </div>
      {open && (
        <div className="border-t bg-muted/20 px-4 py-2">
          {error && (
            <p className="py-2 text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          {tags === null && !error ? (
            <p className="py-2 text-xs text-muted-foreground">{t("loading")}</p>
          ) : tags && tags.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">
              {canManage ? t("noTagsManage") : t("noTags")}
            </p>
          ) : (
            tags && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("tag")}</TableHead>
                    <TableHead>{t("digest")}</TableHead>
                    <TableHead className="text-end">{t("size")}</TableHead>
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
                      <TableCell className="text-end tabular-nums">
                        {formatBytes(tag.size)}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("deleteTagLabel", { name: tag.name })}
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
            <DialogTitle>{t("deleteTag.title", { name: toDelete?.name ?? "" })}</DialogTitle>
            <DialogDescription>
              {t.rich("deleteTag.description", { em: (c) => <em>{c}</em> })}
              {toDelete && sharedDigest(toDelete).length > 0 && (
                <>
                  {" "}
                  {t.rich("deleteTag.shared", {
                    b: (c) => (
                      <span className="font-medium text-foreground">{c}</span>
                    ),
                    code: (c) => <code>{c}</code>,
                    names: sharedDigest(toDelete)
                      .map((x) => x.name)
                      .join(", "),
                  })}
                </>
              )}{" "}
              {t("deleteTag.diskNote")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              {t("cancel")}
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
              {pending ? t("deleting") : t("delete")}
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
            <DialogTitle>{t("deleteImage.title", { name: repo.name })}</DialogTitle>
            <DialogDescription>
              {t("deleteImage.description", { count: repo.tagCount })}
            </DialogDescription>
          </DialogHeader>
          {usage === null ? (
            <p className="text-xs text-muted-foreground">
              {t("deleteImage.checking")}
            </p>
          ) : usage.length > 0 ? (
            <p className="text-xs text-destructive">
              {t.rich("deleteImage.usedBy", {
                count: usage.length,
                b: (c) => <span className="font-medium">{c}</span>,
                names: usage.map((u) => u.applicationName).join(", "),
              })}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={imagePending}
              onClick={() => setImageDialogOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={imagePending || usage === null}
              onClick={confirmDeleteImage}
            >
              {imagePending ? t("deleting") : t("deleteImage.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
