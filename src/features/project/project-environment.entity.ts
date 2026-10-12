/** An application or compose stack linked to a project environment. */
export interface ProjectEnvironmentUser {
  kind: "application" | "compose"
  id: string
  name: string
}

/**
 * One environment of a project (GET /projects/:id/environments). The API
 * never sends values here: those come from the audited reveal action.
 */
export interface ProjectEnvironment {
  id: string
  name: string
  /** Only project admins can reveal or edit the values. */
  protected: boolean
  /** Variable names, in file order. */
  keys: string[]
  /** Variables flagged secret (always masked in logs). Names only. */
  secretKeys: string[]
  /** Variables explicitly flagged not secret; unmarked ones are in neither list. */
  plainKeys: string[]
  updatedAt: string
  usedBy: ProjectEnvironmentUser[]
}

/** What an environment select needs. */
export type EnvironmentOption = Pick<
  ProjectEnvironment,
  "id" | "name" | "protected"
>

/** Name used when an app has no explicit choice yet. */
export const PRODUCTION_ENVIRONMENT = "production"

/** How a change reached the environment. */
export type EnvironmentVersionAction =
  "edit" | "set" | "unset" | "push" | "restore" | "promote" | "baseline"

/** One entry of the version history (names only, never values). */
export interface EnvironmentVersion {
  id: string
  createdAt: string
  /** Email at the time of the change; null for the system baseline or a deleted account. */
  authorEmail: string | null
  via: "session" | "token" | "system"
  action: EnvironmentVersionAction
  detail: string | null
  summary: {
    added: string[]
    changed: string[]
    removed: string[]
    flags: string[]
  }
  /** The newest version is the current content. */
  current: boolean
}

/** Key-level comparison of two environments (GET .../environments/diff). */
export interface EnvironmentDiff {
  from: { id: string; name: string }
  to: { id: string; name: string }
  /** False when the caller cannot reveal both sides: values were not compared. */
  comparable: boolean
  onlyInFrom: string[]
  onlyInTo: string[]
  inBoth: string[]
  different: string[] | null
  same: string[] | null
}

/** Names that look like a secret; mirrors the API rule that flags a newly added variable. */
export const SECRET_NAME = /password|secret|token|key|private|credential/i
