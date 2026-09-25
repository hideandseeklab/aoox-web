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
import { setupAction, type SetupState } from "@/features/auth/auth.actions"

const initialState: SetupState = {}

export function SetupForm() {
  const [state, action, pending] = useActionState(setupAction, initialState)
  const errors = (key: "name" | "email" | "password") =>
    state.fieldErrors?.[key]?.map((message) => ({ message }))

  return (
    <form action={action} noValidate>
      <FieldGroup>
        <Field data-invalid={!!state.fieldErrors?.name || undefined}>
          <FieldLabel htmlFor="name">Nama</FieldLabel>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Admin"
            defaultValue={state.values?.name ?? ""}
            aria-invalid={!!state.fieldErrors?.name || undefined}
          />
          <FieldError errors={errors("name")} />
        </Field>

        <Field data-invalid={!!state.fieldErrors?.email || undefined}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            defaultValue={state.values?.email ?? ""}
            aria-invalid={!!state.fieldErrors?.email || undefined}
            required
          />
          <FieldError errors={errors("email")} />
        </Field>

        <Field data-invalid={!!state.fieldErrors?.password || undefined}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!state.fieldErrors?.password || undefined}
            required
          />
          <FieldDescription>Minimal 8 karakter.</FieldDescription>
          <FieldError errors={errors("password")} />
        </Field>

        {state.error && (
          <FieldDescription className="text-destructive" role="alert">
            {state.error}
          </FieldDescription>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Membuat akun…" : "Buat akun owner"}
        </Button>
      </FieldGroup>
    </form>
  )
}
