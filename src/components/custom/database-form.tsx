"use client"

import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
import type { DatabaseFormState } from "@/features/managed-database/managed-database.actions"
import {
  ENGINE_DEFAULT_TAG,
  ENGINE_LABEL,
  POSTGRES_VARIANT_INFO,
  type DatabaseEngine,
  type PostgresVariant,
} from "@/features/managed-database/managed-database.entity"

const NO_VARIANT = "none"

/** Engine + variant + tag + port — this is the whole database create form, there is no edit form (changing engine/variant after creation isn't supported). */
export function DatabaseForm({
  action,
  submitLabel,
  cancelHref,
  onPendingChange,
}: {
  action: (
    prev: DatabaseFormState,
    formData: FormData
  ) => Promise<DatabaseFormState>
  submitLabel: string
  /** Renders a "Batal" link back to the project (standalone create page). */
  cancelHref?: string
  /** Lets a dialog lock its close button while submitting. */
  onPendingChange?: (pending: boolean) => void
}) {
  const [engine, setEngine] = useState<DatabaseEngine>("postgres")
  const [variant, setVariant] = useState<
    Exclude<PostgresVariant, null> | typeof NO_VARIANT
  >(NO_VARIANT)
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})
  const toastIdRef = useRef<string | number | undefined>(undefined)
  const wasPendingRef = useRef(false)
  const errs = (k: keyof NonNullable<DatabaseFormState["fieldErrors"]>) =>
    state.fieldErrors?.[k]?.map((message) => ({ message }))

  // `createDatabaseAction` no longer redirects itself (a server `redirect()`
  // would fire before this toast could be resolved) — navigate once the row
  // exists; provisioning (pulling the image, starting the container) keeps
  // running in the background, see the database page's own status.
  useEffect(() => {
    if (wasPendingRef.current && !pending) {
      if (state.createdId) {
        toast.success(
          `Database "${state.values?.name ?? ""}" dibuat — sedang disiapkan (pull image bisa beberapa menit).`,
          { id: toastIdRef.current }
        )
        router.push(`/databases/${state.createdId}`)
      } else if (state.error || state.fieldErrors) {
        toast.error(state.error ?? "Periksa isian form", {
          id: toastIdRef.current,
        })
      }
    }
    wasPendingRef.current = pending
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to a pending->settled transition
  }, [pending])

  useEffect(() => {
    onPendingChange?.(pending)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending])

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const formData = new FormData(e.currentTarget)
        toastIdRef.current = toast.loading(
          `Membuat database ${String(formData.get("name") || "").trim() || "baru"}…`
        )
      }}
      noValidate
    >
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
            onValueChange={(v) => {
              setEngine(v as DatabaseEngine)
              if (v !== "postgres") setVariant(NO_VARIANT)
            }}
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
        {engine === "postgres" && (
          <Field>
            <FieldLabel htmlFor="db-variant">Varian (opsional)</FieldLabel>
            <Select
              name="variant"
              value={variant}
              onValueChange={(v) =>
                setVariant(v as Exclude<PostgresVariant, null> | typeof NO_VARIANT)
              }
            >
              <SelectTrigger id="db-variant">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_VARIANT}>PostgreSQL polos</SelectItem>
                {(
                  Object.keys(POSTGRES_VARIANT_INFO) as Array<
                    Exclude<PostgresVariant, null>
                  >
                ).map((v) => (
                  <SelectItem key={v} value={v}>
                    {POSTGRES_VARIANT_INFO[v].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              {variant === NO_VARIANT
                ? "Image postgres standar, tanpa ekstensi tambahan."
                : POSTGRES_VARIANT_INFO[variant].description}
            </FieldDescription>
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!state.fieldErrors?.imageTag || undefined}>
            <FieldLabel htmlFor="db-tag">Versi (tag image)</FieldLabel>
            <Input
              id="db-tag"
              name="imageTag"
              placeholder={
                engine === "postgres" && variant !== NO_VARIANT
                  ? POSTGRES_VARIANT_INFO[variant].defaultTag
                  : ENGINE_DEFAULT_TAG[engine]
              }
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
          Publikasikan port host hanya kalau perlu diakses dari luar (mis. dari
          laptop kamu).
        </FieldDescription>
        {state.error && (
          <FieldDescription className="text-destructive" role="alert">
            {state.error}
          </FieldDescription>
        )}
        <div className="flex justify-end gap-2">
          {cancelHref && (
            <Button asChild variant="outline">
              <Link href={cancelHref}>Batal</Link>
            </Button>
          )}
          <Button type="submit" disabled={pending}>
            {pending && (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            )}
            {pending ? "Membuat…" : submitLabel}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
