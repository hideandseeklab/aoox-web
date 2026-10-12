"use client"

import { useTranslations } from "next-intl"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ProjectFormState } from "@/features/project/project.actions"

interface ProjectFormProps {
  action: (
    prev: ProjectFormState,
    formData: FormData
  ) => Promise<ProjectFormState>
  defaultValues?: { name: string; description: string }
  submitLabel: string
  onSuccess?: () => void
  /** Project viewers: show every value but disable all fields and hide Save. */
  readOnly?: boolean
}

export function ProjectForm({
  action,
  defaultValues,
  submitLabel,
  readOnly = false,
}: ProjectFormProps) {
  const t = useTranslations("projects")
  const tc = useTranslations("common")
  const [state, formAction, pending] = useActionState(action, {
    values: defaultValues,
  })
  const values = state.values ?? defaultValues

  return (
    <form action={formAction} noValidate>
      <fieldset disabled={readOnly} className="contents">
      <FieldGroup>
        <Field data-invalid={!!state.fieldErrors?.name || undefined}>
          <FieldLabel htmlFor="name">{tc("labels.name")}</FieldLabel>
          <Input
            id="name"
            name="name"
            placeholder={t("form.namePlaceholder")}
            defaultValue={values?.name ?? ""}
            aria-invalid={!!state.fieldErrors?.name || undefined}
            autoFocus
            required
          />
          <FieldError
            errors={state.fieldErrors?.name?.map((message) => ({ message }))}
          />
        </Field>

        <Field data-invalid={!!state.fieldErrors?.description || undefined}>
          <FieldLabel htmlFor="description">{tc("labels.description")}</FieldLabel>
          <Textarea
            id="description"
            name="description"
            rows={3}
            placeholder={tc("states.optional")}
            defaultValue={values?.description ?? ""}
            aria-invalid={!!state.fieldErrors?.description || undefined}
          />
          <FieldError
            errors={state.fieldErrors?.description?.map((message) => ({
              message,
            }))}
          />
        </Field>

        {state.error && (
          <FieldDescription className="text-destructive" role="alert">
            {state.error}
          </FieldDescription>
        )}

        {!readOnly && (
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? tc("states.saving") : submitLabel}
          </Button>
        </div>
        )}
      </FieldGroup>
      </fieldset>
    </form>
  )
}
