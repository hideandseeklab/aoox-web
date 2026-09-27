"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  fetchRepositoriesAction,
  fetchTagsAction,
} from "@/features/registry/registry.actions"
import type {
  RepositorySummary,
  Tag,
} from "@/features/registry/registry.entity"
import type { Registry } from "@/features/registry/registry.entity"

/**
 * Browse repositories/tags already pushed to one of the account's registries
 * (self-hosted or external) and turn a pick into a ready `<url>/<repo>:<tag>`
 * image ref — instead of the operator having to remember and retype it after
 * `docker push`. Uses the same `GET /registries/:id/repositories[/…/tags]`
 * endpoints as the Registry page's own browser.
 */
export function ImagePickerDialog({
  registries,
  onPick,
}: {
  registries: Registry[]
  onPick: (imageRef: string, registryId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [registryId, setRegistryId] = useState("")
  const [repositories, setRepositories] = useState<RepositorySummary[] | null>(
    null
  )
  const [repository, setRepository] = useState("")
  const [tags, setTags] = useState<Tag[] | null>(null)
  const [tag, setTag] = useState("")

  const pickRegistry = (id: string) => {
    setRegistryId(id)
    setError(null)
    setRepositories(null)
    setRepository("")
    setTags(null)
    setTag("")
    start(async () => {
      const r = await fetchRepositoriesAction(id)
      if (r.ok) setRepositories(r.data)
      else setError(r.error)
    })
  }

  const pickRepository = (repo: string) => {
    setRepository(repo)
    setTags(null)
    setTag("")
    start(async () => {
      const r = await fetchTagsAction(registryId, repo)
      if (r.ok) setTags(r.data)
      else setError(r.error)
    })
  }

  const reset = () => {
    setError(null)
    setRegistryId("")
    setRepositories(null)
    setRepository("")
    setTags(null)
    setTag("")
  }

  const selectedRegistry = registries.find((r) => r.id === registryId)
  const canConfirm = !!selectedRegistry && !!repository && !!tag

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Pilih dari registry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pilih image dari registry</DialogTitle>
          <DialogDescription>
            Cuma menampilkan repository/tag yang sudah pernah di-push —{" "}
            <code>docker push</code> dulu kalau belum ada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Registry</label>
            <Select value={registryId} onValueChange={pickRegistry}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih registry" />
              </SelectTrigger>
              <SelectContent>
                {registries.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} · {r.url}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {registryId && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Repository</label>
              <Select
                value={repository}
                onValueChange={pickRepository}
                disabled={pending && repositories === null}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      pending && repositories === null
                        ? "Memuat…"
                        : repositories?.length === 0
                          ? "Belum ada image di registry ini"
                          : "Pilih repository"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(repositories ?? []).map((repo) => (
                    <SelectItem key={repo.name} value={repo.name}>
                      {repo.name}{" "}
                      <span className="text-muted-foreground">
                        ({repo.tagCount} tag)
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {repository && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tag</label>
              <Select
                value={tag}
                onValueChange={setTag}
                disabled={tags === null}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      tags === null
                        ? "Memuat…"
                        : tags.length === 0
                          ? "Tidak ada tag"
                          : "Pilih tag"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(tags ?? []).map((t) => (
                    <SelectItem key={t.name} value={t.name}>
                      {t.name}{" "}
                      <span className="font-mono text-xs text-muted-foreground">
                        {t.digest.replace("sha256:", "").slice(0, 12)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              if (!selectedRegistry) return
              onPick(`${selectedRegistry.url}/${repository}:${tag}`, registryId)
              setOpen(false)
            }}
          >
            Pakai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
