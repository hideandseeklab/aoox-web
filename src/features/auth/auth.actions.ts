"use server"

import { redirect } from "next/navigation"
import { api, ApiError } from "@/lib/api"
import type { SignInResponse, TwoFactorRequired } from "./auth.entity"
import { setupSchema, signInSchema } from "./auth.schema"
import { clearSession, setSession } from "./auth.session"

export interface SignInState {
  error?: string
  fieldErrors?: Partial<Record<"email" | "password", string[]>>
  values?: { email: string }
  /** Set when the API asked for the second factor; the form switches to the code step. */
  challengeToken?: string
}

export async function signInAction(
  _prev: SignInState,
  formData: FormData
): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return {
      fieldErrors: flattenFieldErrors(parsed.error),
      values: { email: String(formData.get("email") ?? "") },
    }
  }

  try {
    const result = await api<SignInResponse | TwoFactorRequired>(
      "/auth/sign-in",
      { method: "POST", body: parsed.data }
    )
    if ("requiresTwoFactor" in result) {
      return {
        challengeToken: result.challengeToken,
        values: { email: parsed.data.email },
      }
    }
    await setSession({ token: result.accessToken, user: result.user })
  } catch (err) {
    const message =
      err instanceof ApiError
        ? err.status === 401
          ? "Email atau password salah"
          : err.message
        : "Tidak dapat terhubung ke server"
    return { error: message, values: { email: parsed.data.email } }
  }

  redirect("/")
}

/** Second sign-in step: TOTP or backup code against the challenge token. */
export async function signInTwoFactorAction(
  _prev: SignInState,
  formData: FormData
): Promise<SignInState> {
  const challengeToken = String(formData.get("challengeToken") ?? "")
  const code = String(formData.get("code") ?? "").trim()
  const email = String(formData.get("email") ?? "")
  if (!code) {
    return { challengeToken, values: { email }, error: "Masukkan kode" }
  }
  try {
    const result = await api<SignInResponse>("/auth/sign-in/2fa", {
      method: "POST",
      body: { challengeToken, code },
    })
    await setSession({ token: result.accessToken, user: result.user })
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      // Challenge expired (5 min) → back to step one; otherwise just a wrong code.
      const expired = /sign in again/i.test(err.message)
      return expired
        ? { values: { email }, error: "Sesi kedaluwarsa, masuk lagi" }
        : { challengeToken, values: { email }, error: "Kode salah" }
    }
    return {
      challengeToken,
      values: { email },
      error:
        err instanceof ApiError
          ? err.message
          : "Tidak dapat terhubung ke server",
    }
  }
  redirect("/")
}

export interface SetupState {
  error?: string
  fieldErrors?: Partial<Record<"name" | "email" | "password", string[]>>
  values?: { name: string; email: string }
}

/** First-run onboarding: creates the owner account and signs in. */
export async function setupAction(
  _prev: SetupState,
  formData: FormData
): Promise<SetupState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  }
  const parsed = setupSchema.safeParse({
    ...values,
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { fieldErrors: flattenFieldErrors(parsed.error), values }
  }

  try {
    const result = await api<SignInResponse>("/auth/setup", {
      method: "POST",
      body: parsed.data,
    })
    await setSession({ token: result.accessToken, user: result.user })
  } catch (err) {
    const message =
      err instanceof ApiError
        ? err.status === 409
          ? "Setup sudah pernah dilakukan. Silakan sign in."
          : err.message
        : "Tidak dapat terhubung ke server"
    return { error: message, values }
  }

  redirect("/")
}

export async function signOutAction(): Promise<void> {
  await clearSession()
  redirect("/sign-in")
}

// Keep zod's flatten shape local so the client never imports zod.
function flattenFieldErrors<K extends string>(error: {
  issues: { path: PropertyKey[]; message: string }[]
}): Partial<Record<K, string[]>> {
  const out: Partial<Record<K, string[]>> = {}
  for (const issue of error.issues) {
    const key = issue.path[0] as K
    ;(out[key] ??= []).push(issue.message)
  }
  return out
}
