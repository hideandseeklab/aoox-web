import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"
import { api, ApiError } from "@/lib/api"
import type { AuthUser, Session } from "./auth.entity"

export const SESSION_COOKIE = "aoox_session"

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days, matches JWT_EXPIRES_IN

/**
 * Whether the session cookie carries the `Secure` flag. Browsers drop Secure
 * cookies over plain http (except on localhost), so a self-hosted install
 * reached via http://<ip> would never stay signed in. COOKIE_SECURE overrides;
 * otherwise derive it from the scheme of WEB_ORIGIN (falls back to NODE_ENV).
 */
function cookieSecure(): boolean {
  const override = process.env.COOKIE_SECURE?.trim().toLowerCase()
  if (override === "true") return true
  if (override === "false") return false
  const origin = process.env.WEB_ORIGIN
  if (origin) return origin.startsWith("https://")
  return process.env.NODE_ENV === "production"
}

export async function setSession(session: Session): Promise<void> {
  const store = await cookies()
  store.set({
    name: SESSION_COOKIE,
    value: JSON.stringify(session),
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  })
}

export async function clearSession(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies()
  const raw = store.get(SESSION_COOKIE)?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<Session>
    if (typeof parsed.token !== "string" || !parsed.user) return null
    return { token: parsed.token, user: parsed.user as AuthUser }
  } catch {
    return null
  }
}

/** Returns the session token or redirects to sign-in. Server-only. */
export async function requireToken(): Promise<string> {
  const session = await getSession()
  if (!session) redirect("/sign-in")
  return session.token
}

/**
 * Session from the cookie, verified against the API (`GET /auth/me`).
 * Returns null when the cookie is missing, expired, signed with another
 * secret, or the user no longer exists. Cached per request.
 */
export const getVerifiedSession = cache(async (): Promise<Session | null> => {
  const session = await getSession()
  if (!session) return null
  try {
    const user = await api<AuthUser>("/auth/me", { token: session.token })
    return { token: session.token, user }
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null
    throw err
  }
})
