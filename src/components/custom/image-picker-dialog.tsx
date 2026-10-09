"use client"

import { useTranslations } from "next-intl"
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
  const t = useTranslations("applications")
  const tc = useTranslations("common")
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
          {t("imagePicker.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("imagePicker.title")}</DialogTitle>
          <DialogDescription>
            {t.rich("imagePicker.description", {
              code: (chunks) => <code>{chunks}</code>,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">
              {t("imagePicker.registry")}
            </label>
            <Select value={registryId} onValueChange={pickRegistry}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("imagePicker.pickRegistry")} />
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
              <label className="text-xs font-medium">
                {t("imagePicker.repository")}
              </label>
              <Select
                value={repository}
                onValueChange={pickRepository}
                disabled={pending && repositories === null}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      pending && repositories === null
                        ? tc("states.loading")
                        : repositories?.length === 0
                          ? t("imagePicker.noImages")
                          : t("imagePicker.pickRepository")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(repositories ?? []).map((repo) => (
                    <SelectItem key={repo.name} value={repo.name}>
                      {repo.name}{" "}
                      <span className="text-muted-foreground">
                        ({t("imagePicker.tagCount", { count: repo.tagCount })})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {repository && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                {t("imagePicker.tag")}
              </label>
              <Select
                value={tag}
                onValueChange={setTag}
                disabled={tags === null}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      tags === null
                        ? tc("states.loading")
                        : tags.length === 0
                          ? t("imagePicker.noTags")
                          : t("imagePicker.pickTag")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(tags ?? []).map((tg) => (
                    <SelectItem key={tg.name} value={tg.name}>
                      {tg.name}{" "}
                      <span className="font-mono text-xs text-muted-foreground">
                        {tg.digest.replace("sha256:", "").slice(0, 12)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            {tc("actions.cancel")}
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
            {t("imagePicker.use")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
