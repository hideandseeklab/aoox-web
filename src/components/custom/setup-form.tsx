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
import { setupAction, type SetupState } from "@/features/auth/auth.actions"

const initialState: SetupState = {}

export function SetupForm() {
  const t = useTranslations("auth.setup")
  const [state, action, pending] = useActionState(setupAction, initialState)
  const errors = (key: "name" | "email" | "password") =>
    state.fieldErrors?.[key]?.map((message) => ({ message }))

  return (
    <form action={action} noValidate>
      <FieldGroup>
        <Field data-invalid={!!state.fieldErrors?.name || undefined}>
          <FieldLabel htmlFor="name">{t("name")}</FieldLabel>
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
          <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
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
          <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!state.fieldErrors?.password || undefined}
            required
          />
          <FieldDescription>{t("passwordHint")}</FieldDescription>
          <FieldError errors={errors("password")} />
        </Field>

        {state.error && (
          <FieldDescription className="text-destructive" role="alert">
            {state.error}
          </FieldDescription>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t("submitting") : t("submit")}
        </Button>
      </FieldGroup>
    </form>
  )
}
