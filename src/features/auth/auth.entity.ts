export type UserRole = "owner" | "admin" | "member"

export interface AuthUser {
  id: string
  email: string
  name: string | null
  role: UserRole
  /** Present on `/auth/me` responses. */
  twoFactorEnabled?: boolean
}

export interface SignInResponse {
  accessToken: string
  user: AuthUser
}

/** Password accepted, second factor pending. */
export interface TwoFactorRequired {
  requiresTwoFactor: true
  challengeToken: string
}

export interface Session {
  token: string
  user: AuthUser
}

/** Roles allowed to open the host terminal (mirrors TERMINAL_ROLES in the API). */
export const TERMINAL_ROLES: ReadonlySet<UserRole> = new Set(["owner", "admin"])

export function canUseTerminal(user: AuthUser): boolean {
  return TERMINAL_ROLES.has(user.role)
}
