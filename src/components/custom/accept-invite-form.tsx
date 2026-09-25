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
import {
  acceptInvitationAction,
  type AcceptInviteState,
} from "@/features/member/member.actions"

const initialState: AcceptInviteState = {}

export function AcceptInviteForm({
  token,
  email,
}: {
  token: string
  email: string
}) {
  const [state, action, pending] = useActionState(
    acceptInvitationAction.bind(null, token),
    initialState
  )
  const errs = (k: "name" | "password") =>
    state.fieldErrors?.[k]?.map((message) => ({ message }))

  return (
    <form action={action} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="inv-email">Email</FieldLabel>
          <Input id="inv-email" value={email} readOnly disabled />
        </Field>
        <Field data-invalid={!!state.fieldErrors?.name || undefined}>
          <FieldLabel htmlFor="inv-name">Nama</FieldLabel>
          <Input
            id="inv-name"
            name="name"
            defaultValue={state.values?.name}
            autoFocus
          />
          <FieldError errors={errs("name")} />
        </Field>
        <Field data-invalid={!!state.fieldErrors?.password || undefined}>
          <FieldLabel htmlFor="inv-password">Password</FieldLabel>
          <Input
            id="inv-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
          <FieldDescription>Minimal 8 karakter.</FieldDescription>
          <FieldError errors={errs("password")} />
        </Field>
        {state.error && (
          <FieldDescription className="text-destructive" role="alert">
            {state.error}
          </FieldDescription>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Membuat akun…" : "Buat akun & masuk"}
        </Button>
      </FieldGroup>
    </form>
  )
}
