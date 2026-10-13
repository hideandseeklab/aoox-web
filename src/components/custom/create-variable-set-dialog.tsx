"use client"

import { Loader2, Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { VariableSetSharingFields } from "@/components/custom/variable-set-sharing-fields"
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
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "@/lib/use-router"
import { createVariableSetAction } from "@/features/variable-set/variable-set.actions"
import { VARIABLE_SET_SLUG } from "@/features/variable-set/variable-set.entity"

/** "New set" (instance owner/admin): name, optional slug, description, sharing. */
export function CreateVariableSetDialog({
  projects,
}: {
  projects: { id: string; name: string }[]
}) {
  const t = useTranslations("variables.create")
  const tc = useTranslations("common")
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [sharedWithAll, setSharedWithAll] = useState(false)
  const [projectIds, setProjectIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const slugInvalid = slug !== "" && !VARIABLE_SET_SLUG.test(slug)
  const valid = name.trim() !== "" && !slugInvalid
  // What the API derives when the slug is left empty (shown as the placeholder).
  const derived = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/, "")

  const reset = () => {
    setName("")
    setSlug("")
    setDescription("")
    setSharedWithAll(false)
    setProjectIds([])
    setError(null)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (pending) return
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus data-icon="inline-start" />
          {t("trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90svh] overflow-y-auto sm:max-w-lg"
        showCloseButton={!pending}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              setError(null)
              const r = await createVariableSetAction({
                name,
                slug,
                description,
                sharedWithAll,
                projectIds,
              })
              if (r.ok) {
                toast.success(t("created", { name: name.trim() }))
                setOpen(false)
                reset()
                router.push(`/variables/${r.data.id}`)
              } else setError(r.error)
            })
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="vs-name">{tc("labels.name")}</FieldLabel>
              <Input
                id="vs-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                maxLength={100}
                autoComplete="off"
                autoFocus
                required
              />
            </Field>
            <Field data-invalid={slugInvalid || undefined}>
              <FieldLabel htmlFor="vs-slug">{t("slug")}</FieldLabel>
              <Input
                id="vs-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder={derived || t("slugPlaceholder")}
                maxLength={64}
                autoComplete="off"
                aria-invalid={slugInvalid || undefined}
                className="font-mono"
              />
              <FieldDescription>
                {slugInvalid ? t("slugInvalid") : t("slugHint")}
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="vs-description">
                {t("descriptionLabel")}
              </FieldLabel>
              <Textarea
                id="vs-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={2}
              />
            </Field>
            <Field>
              <FieldLabel>{t("sharing")}</FieldLabel>
              <VariableSetSharingFields
                idPrefix="vs-create"
                projects={projects}
                sharedWithAll={sharedWithAll}
                onSharedWithAllChange={setSharedWithAll}
                projectIds={projectIds}
                onProjectIdsChange={setProjectIds}
                disabled={pending}
              />
            </Field>
          </FieldGroup>
          <p className="text-xs text-muted-foreground">{t("defaultsNote")}</p>
          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" disabled={pending || !valid}>
              {pending && (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              )}
              {pending ? tc("states.creating") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
