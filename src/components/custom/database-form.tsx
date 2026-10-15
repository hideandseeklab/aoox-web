"use client"

import { Check, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useRouter } from "@/lib/use-router"
import { useActionState, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { EngineIcon } from "@/components/custom/brand-icon"
import { RadioCards } from "@/components/custom/radio-cards"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { DatabaseFormState } from "@/features/managed-database/managed-database.actions"
import {
  ENGINE_LABEL,
  POSTGRES_VARIANT_INFO,
  defaultImageFor,
  type DatabaseEngine,
  type PostgresVariant,
} from "@/features/managed-database/managed-database.entity"
import { cn } from "@/lib/utils"

/** Submitted as `variant` for plain Postgres; the action turns it into null. */
const NO_VARIANT = "none"
type VariantChoice = Exclude<PostgresVariant, null> | typeof NO_VARIANT

const ENGINES = Object.keys(ENGINE_LABEL) as DatabaseEngine[]
const VARIANTS: VariantChoice[] = [
  NO_VARIANT,
  ...(Object.keys(POSTGRES_VARIANT_INFO) as Array<
    Exclude<PostgresVariant, null>
  >),
]

/**
 * Engine + variant + tag + port — this is the whole database create form, there is no edit form (changing engine/variant after creation isn't supported).
 * From `lg`: engine cards on the left, the other fields and the buttons on the right; stacked (cards first) below that.
 * The cards and variant chips are `RadioCards`; their values are submitted through hidden inputs with the same names the old selects used.
 */
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
  /** Renders a "Cancel" link back to the project (standalone create page). */
  cancelHref?: string
  /** Lets a dialog lock its close button while submitting. */
  onPendingChange?: (pending: boolean) => void
}) {
  const t = useTranslations("database")
  const tc = useTranslations("common")
  const [engine, setEngine] = useState<DatabaseEngine>("postgres")
  const [variant, setVariant] = useState<VariantChoice>(NO_VARIANT)
  // The tag field stays empty unless the user types one: the API then uses
  // the engine/variant default, which the placeholder and the hint mirror,
  // so switching engines never leaves a stale default behind.
  const fallback = defaultImageFor(
    engine,
    engine === "postgres" && variant !== NO_VARIANT ? variant : null
  )
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
          t("form.toast.created", { name: state.values?.name ?? "" }),
          { id: toastIdRef.current }
        )
        router.push(`/databases/${state.createdId}`)
      } else if (state.error || state.fieldErrors) {
        toast.error(state.error ?? t("form.toast.checkForm"), {
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
        const name = String(formData.get("name") || "").trim()
        toastIdRef.current = toast.loading(
          name
            ? t("form.toast.creating", { name })
            : t("form.toast.creatingNoName")
        )
      }}
      noValidate
      className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8"
    >
      <Field className="content-start">
        <FieldLabel id="db-engine-label">{t("form.fields.engine")}</FieldLabel>
        <input type="hidden" name="engine" value={engine} />
        <RadioCards
          value={engine}
          onValueChange={(v) => {
            setEngine(v)
            if (v !== "postgres") setVariant(NO_VARIANT)
          }}
          options={ENGINES}
          labelledBy="db-engine-label"
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
          itemClassName={(checked) =>
            cn(
              "relative flex min-w-0 flex-col items-start gap-2 rounded-lg border p-3 text-start transition-colors",
              checked ? "border-primary bg-primary/5" : "hover:bg-muted/50"
            )
          }
          renderItem={(e, checked) => (
            <>
              <span className="flex size-9 items-center justify-center rounded-md bg-muted">
                <EngineIcon engine={e} className="size-5" />
              </span>
              <span className="block w-full min-w-0">
                <span className="block truncate text-sm font-medium">
                  {ENGINE_LABEL[e]}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t(`form.engines.${e}`)}
                </span>
              </span>
              {checked && (
                <span
                  className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  aria-hidden
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
            </>
          )}
        />
      </Field>

      <FieldGroup className="content-start">
        <Field data-invalid={!!state.fieldErrors?.name || undefined}>
          <FieldLabel htmlFor="db-name">{tc("labels.name")}</FieldLabel>
          <Input
            id="db-name"
            name="name"
            placeholder="Main DB"
            defaultValue={state.values?.name}
            required
          />
          <FieldError errors={errs("name")} />
        </Field>
        {engine === "postgres" && (
          <Field>
            <FieldLabel id="db-variant-label">
              {t("form.fields.variant")}
            </FieldLabel>
            <input type="hidden" name="variant" value={variant} />
            <RadioCards
              value={variant}
              onValueChange={setVariant}
              options={VARIANTS}
              labelledBy="db-variant-label"
              describedBy="db-variant-description"
              className="flex flex-wrap gap-1.5"
              itemClassName={(checked) =>
                cn(
                  "inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-xs font-medium transition-colors",
                  checked
                    ? "border-primary bg-primary/5"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )
              }
              renderItem={(v, checked) => (
                <>
                  {checked && (
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                  )}
                  {v === NO_VARIANT
                    ? t("form.variants.plain")
                    : POSTGRES_VARIANT_INFO[v].label}
                </>
              )}
            />
            <FieldDescription id="db-variant-description">
              {variant === NO_VARIANT
                ? t("form.variants.noneDescription")
                : t(`form.variants.${variant}`)}
            </FieldDescription>
          </Field>
        )}
        <Field data-invalid={!!state.fieldErrors?.imageTag || undefined}>
          <FieldLabel htmlFor="db-tag">{t("form.fields.imageTag")}</FieldLabel>
          <Input
            id="db-tag"
            name="imageTag"
            className="font-mono"
            placeholder={fallback.tag}
            defaultValue={state.values?.imageTag}
            aria-describedby="db-tag-hint"
          />
          <FieldDescription id="db-tag-hint">
            {t.rich("form.imageTagHint", {
              image: () => (
                <code className="font-mono">
                  {fallback.image}:{fallback.tag}
                </code>
              ),
            })}
          </FieldDescription>
          <FieldError errors={errs("imageTag")} />
        </Field>
        <Field data-invalid={!!state.fieldErrors?.hostPort || undefined}>
          <FieldLabel htmlFor="db-port">{t("form.fields.hostPort")}</FieldLabel>
          <Input
            id="db-port"
            name="hostPort"
            type="number"
            min={1}
            max={65535}
            placeholder={t("form.fields.hostPortPlaceholder")}
            defaultValue={state.values?.hostPort}
            aria-describedby="db-port-hint"
          />
          <FieldDescription id="db-port-hint">
            {t("form.hostPortHint")}
          </FieldDescription>
          <FieldError errors={errs("hostPort")} />
        </Field>
        {state.error && (
          <FieldDescription className="text-destructive" role="alert">
            {state.error}
          </FieldDescription>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {cancelHref && (
            <Button asChild variant="outline">
              <Link href={cancelHref}>{tc("actions.cancel")}</Link>
            </Button>
          )}
          <Button type="submit" disabled={pending}>
            {pending && (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            )}
            {pending ? tc("states.creating") : submitLabel}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
