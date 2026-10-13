"use client"

import { Loader2, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { VariableSetSharingFields } from "@/components/custom/variable-set-sharing-fields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "@/lib/use-router"
import {
  deleteVariableSetAction,
  shareVariableSetAction,
  updateVariableSetAction,
} from "@/features/variable-set/variable-set.actions"
import type { VariableSetDetail } from "@/features/variable-set/variable-set.entity"

/** Name and description (instance owner/admin). The slug never changes. */
export function VariableSetDetailsCard({ set }: { set: VariableSetDetail }) {
  const t = useTranslations("variables.details")
  const tc = useTranslations("common")
  const router = useRouter()
  const [name, setName] = useState(set.name)
  const [description, setDescription] = useState(set.description ?? "")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const dirty =
    name.trim() !== set.name || description.trim() !== (set.description ?? "")

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              setError(null)
              const r = await updateVariableSetAction(set.id, {
                name,
                description,
              })
              if (r.ok) {
                toast.success(t("saved"))
                router.refresh()
              } else setError(r.error)
            })
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="vs-edit-name">
                {tc("labels.name")}
              </FieldLabel>
              <Input
                id="vs-edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="vs-edit-slug">{t("slug")}</FieldLabel>
              <Input
                id="vs-edit-slug"
                value={set.slug}
                readOnly
                className="font-mono text-muted-foreground"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="vs-edit-description">
                {t("descriptionLabel")}
              </FieldLabel>
              <Textarea
                id="vs-edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={2}
              />
            </Field>
          </FieldGroup>
          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={pending || !dirty || name.trim() === ""}
            >
              {pending && (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              )}
              {tc("actions.save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/**
 * All projects vs selected ones. The API refuses (409, naming the apps) when
 * a project would lose access while something in it still links the set.
 */
export function VariableSetSharingCard({
  set,
  projects,
}: {
  set: VariableSetDetail
  projects: { id: string; name: string }[]
}) {
  const t = useTranslations("variables.sharing")
  const tc = useTranslations("common")
  const router = useRouter()
  const initialIds = set.projects.map((p) => p.id)
  const [sharedWithAll, setSharedWithAll] = useState(set.sharedWithAll)
  const [projectIds, setProjectIds] = useState<string[]>(initialIds)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  // Shares of projects missing from the list (none for an owner/admin) are kept.
  const options = [
    ...projects,
    ...set.projects.filter((p) => !projects.some((x) => x.id === p.id)),
  ]
  const dirty =
    sharedWithAll !== set.sharedWithAll ||
    projectIds.length !== initialIds.length ||
    projectIds.some((id) => !initialIds.includes(id))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <VariableSetSharingFields
          idPrefix="vs-share"
          projects={options}
          sharedWithAll={sharedWithAll}
          onSharedWithAllChange={setSharedWithAll}
          projectIds={projectIds}
          onProjectIdsChange={setProjectIds}
          disabled={pending}
        />
        {sharedWithAll && projectIds.length > 0 && (
          <p className="text-xs text-muted-foreground">{t("keptNote")}</p>
        )}
        {error && (
          <p
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          {dirty && (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setSharedWithAll(set.sharedWithAll)
                setProjectIds(initialIds)
                setError(null)
              }}
            >
              {tc("actions.cancel")}
            </Button>
          )}
          <Button
            type="button"
            disabled={pending || !dirty}
            onClick={() =>
              start(async () => {
                setError(null)
                const r = await shareVariableSetAction(
                  set.id,
                  sharedWithAll,
                  projectIds
                )
                if (r.ok) {
                  toast.success(t("saved"))
                  router.refresh()
                } else setError(r.error)
              })
            }
          >
            {pending && (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            )}
            {tc("actions.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/** Danger-zone button: permanent deletion of the set (409 while anything links it). */
export function DeleteVariableSetButton({ set }: { set: VariableSetDetail }) {
  const t = useTranslations("variables.danger")
  const tc = useTranslations("common")
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (pending) return
        setOpen(o)
        if (!o) setError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 data-icon="inline-start" />
          {t("delete")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>{t("confirmTitle", { name: set.name })}</DialogTitle>
          <DialogDescription>{t("confirmBody")}</DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            {tc("actions.cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null)
                const r = await deleteVariableSetAction(set.id)
                if (r.ok) {
                  toast.success(t("deleted", { name: set.name }))
                  setOpen(false)
                  router.push("/variables")
                } else setError(r.error)
              })
            }
          >
            {pending ? tc("states.deleting") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
