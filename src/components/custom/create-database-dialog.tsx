"use client"

import { Plus } from "lucide-react"
import { useActionState, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createDatabaseAction,
  type DatabaseFormState,
} from "@/features/managed-database/managed-database.actions"
import {
  ENGINE_DEFAULT_TAG,
  ENGINE_LABEL,
  type DatabaseEngine,
} from "@/features/managed-database/managed-database.entity"

const initialState: DatabaseFormState = {}

export function CreateDatabaseDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  const [engine, setEngine] = useState<DatabaseEngine>("postgres")
  const [state, action, pending] = useActionState(
    createDatabaseAction.bind(null, projectId),
    initialState
  )
  const errs = (k: keyof NonNullable<DatabaseFormState["fieldErrors"]>) =>
    state.fieldErrors?.[k]?.map((message) => ({ message }))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus data-icon="inline-start" />
          New database
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Database baru</DialogTitle>
          <DialogDescription>
            Dijalankan sebagai container dengan volume persisten di network
            aoox; aplikasi di project ini bisa mengaksesnya lewat nama
            host internal.
          </DialogDescription>
        </DialogHeader>
        <form action={action} noValidate>
          <FieldGroup>
            <Field data-invalid={!!state.fieldErrors?.name || undefined}>
              <FieldLabel htmlFor="db-name">Nama</FieldLabel>
              <Input
                id="db-name"
                name="name"
                placeholder="Main DB"
                defaultValue={state.values?.name}
                required
              />
              <FieldError errors={errs("name")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="db-engine">Engine</FieldLabel>
              <Select
                name="engine"
                value={engine}
                onValueChange={(v) => setEngine(v as DatabaseEngine)}
              >
                <SelectTrigger id="db-engine">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ENGINE_LABEL) as DatabaseEngine[]).map((e) => (
                    <SelectItem key={e} value={e}>
                      {ENGINE_LABEL[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!state.fieldErrors?.imageTag || undefined}>
                <FieldLabel htmlFor="db-tag">Versi (tag image)</FieldLabel>
                <Input
                  id="db-tag"
                  name="imageTag"
                  placeholder={ENGINE_DEFAULT_TAG[engine]}
                  defaultValue={state.values?.imageTag}
                />
                <FieldError errors={errs("imageTag")} />
              </Field>
              <Field data-invalid={!!state.fieldErrors?.hostPort || undefined}>
                <FieldLabel htmlFor="db-port">Port host</FieldLabel>
                <Input
                  id="db-port"
                  name="hostPort"
                  type="number"
                  min={1}
                  max={65535}
                  placeholder="kosong = internal saja"
                  defaultValue={state.values?.hostPort}
                />
                <FieldError errors={errs("hostPort")} />
              </Field>
            </div>
            <FieldDescription>
              Publikasikan port host hanya kalau perlu diakses dari luar (mis.
              dari laptop kamu).
            </FieldDescription>
            {state.error && (
              <FieldDescription className="text-destructive" role="alert">
                {state.error}
              </FieldDescription>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Membuat…" : "Buat database"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
