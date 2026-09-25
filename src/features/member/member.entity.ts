import type { UserRole } from "@/features/auth/auth.entity"

/** Mirrors the User entity (no password hash) and InvitationDto in aoox-api. */
export interface Member {
  id: string
  email: string
  name: string | null
  role: UserRole
  createdAt: string
}

export interface Invitation {
  id: string
  email: string
  role: UserRole
  invitedById: string | null
  expiresAt: string
  acceptedAt: string | null
  createdAt: string
  pending: boolean
}

export interface CreatedInvitation {
  id: string
  email: string
  role: UserRole
  expiresAt: string
  /** Shown once. */
  token: string
  acceptUrl: string | null
}

export interface InvitationPreview {
  email: string
  role: UserRole
  expiresAt: string
}

export const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
}
