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
import {
  signInAction,
  signInTwoFactorAction,
  type SignInState,
} from "@/features/auth/auth.actions"

const initialState: SignInState = {}

export function SignInForm() {
  const t = useTranslations("auth.signIn")
  const [state, action, pending] = useActionState(signInAction, initialState)
  const [twoFactor, twoFactorAction, twoFactorPending] = useActionState(
    signInTwoFactorAction,
    initialState
  )
  // Once the code step has run, its result decides which step shows: a
  // returned challenge keeps step 2 (wrong code), none sends back to step 1
  // (challenge expired) with its message.
  const ranStep2 = twoFactor !== initialState
  const challenge = ranStep2 ? twoFactor.challengeToken : state.challengeToken
  const step2 = !!challenge
  const expired = ranStep2 && !twoFactor.challengeToken ? twoFactor.error : null

  if (step2 && challenge) {
    return (
      <form action={twoFactorAction} noValidate>
        <input type="hidden" name="challengeToken" value={challenge} />
        <input
          type="hidden"
          name="email"
          value={twoFactor.values?.email ?? state.values?.email ?? ""}
        />
        <FieldGroup>
          <Field data-invalid={!!twoFactor.error || undefined}>
            <FieldLabel htmlFor="code">{t("codeLabel")}</FieldLabel>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              autoFocus
              required
            />
            <FieldDescription>
              {t("codeHint")}
            </FieldDescription>
          </Field>
          {twoFactor.error && (
            <FieldDescription className="text-destructive" role="alert">
              {twoFactor.error}
            </FieldDescription>
          )}
          <Button type="submit" className="w-full" disabled={twoFactorPending}>
            {twoFactorPending ? t("verifying") : t("verify")}
          </Button>
        </FieldGroup>
      </form>
    )
  }

  return (
    <form action={action} noValidate>
      <FieldGroup>
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
          <FieldError
            errors={state.fieldErrors?.email?.map((message) => ({ message }))}
          />
        </Field>

        <Field data-invalid={!!state.fieldErrors?.password || undefined}>
          <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!state.fieldErrors?.password || undefined}
            required
          />
          <FieldError
            errors={state.fieldErrors?.password?.map((message) => ({
              message,
            }))}
          />
        </Field>

        {(state.error || expired) && (
          <FieldDescription className="text-destructive" role="alert">
            {state.error ?? expired}
          </FieldDescription>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t("submitting") : t("submit")}
        </Button>
      </FieldGroup>
    </form>
  )
}
