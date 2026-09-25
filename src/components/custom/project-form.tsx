"use client"

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
import { EnvEditor } from "@/components/custom/env-editor"
import type { ProjectFormState } from "@/features/project/project.actions"

interface ProjectFormProps {
  action: (
    prev: ProjectFormState,
    formData: FormData
  ) => Promise<ProjectFormState>
  defaultValues?: { name: string; description: string; env?: string }
  submitLabel: string
  onSuccess?: () => void
  /** Show the shared environment editor (project settings only). */
  showEnv?: boolean
}

export function ProjectForm({
  action,
  defaultValues,
  submitLabel,
  showEnv,
}: ProjectFormProps) {
  const [state, formAction, pending] = useActionState(action, {
    values: defaultValues,
  })
  const values = state.values ?? defaultValues

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <Field data-invalid={!!state.fieldErrors?.name || undefined}>
          <FieldLabel htmlFor="name">Nama</FieldLabel>
          <Input
            id="name"
            name="name"
            placeholder="my-app"
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
          <FieldLabel htmlFor="description">Deskripsi</FieldLabel>
          <Textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Opsional"
            defaultValue={values?.description ?? ""}
            aria-invalid={!!state.fieldErrors?.description || undefined}
          />
          <FieldError
            errors={state.fieldErrors?.description?.map((message) => ({
              message,
            }))}
          />
        </Field>

        {showEnv && (
          <Field data-invalid={!!state.fieldErrors?.env || undefined}>
            <FieldLabel>Environment bersama</FieldLabel>
            <EnvEditor name="env" defaultValue={values?.env ?? ""} />
            <FieldDescription>
              Diwarisi semua aplikasi di project ini (env aplikasi menang bila
              key sama). Aplikasi bisa merujuknya sebagai{" "}
              <code>{"${{project.KEY}}"}</code>. Berlaku pada deploy berikutnya.
            </FieldDescription>
            <FieldError
              errors={state.fieldErrors?.env?.map((message) => ({ message }))}
            />
          </Field>
        )}

        {state.error && (
          <FieldDescription className="text-destructive" role="alert">
            {state.error}
          </FieldDescription>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Menyimpan…" : submitLabel}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
