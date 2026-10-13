/**
 * Variable sets ("Variables"): platform-level groups of environments whose
 * `KEY=VALUE` text applications and compose stacks link, in order. Mirrors the
 * contract in aoox-api AGENTS "Variable sets". The API never sends values here;
 * they only come from the audited reveal actions.
 */

/** The caller's role on a set: instance owner/admin, or the best project role it holds. */
export type VariableSetRole = "platform" | "admin" | "developer" | "viewer"

/** An application or compose stack linking one environment of a set. */
export interface EnvironmentUser {
  kind: "application" | "compose"
  id: string
  name: string
  projectId: string
  projectName: string
  /** 0-based place in the owner's link list (later wins). */
  position: number
}

/** One environment of a set as the list shows it. */
export interface EnvironmentSummary {
  id: string
  name: string
  /** Values are revealable/editable by instance owners/admins only. */
  protected: boolean
  keyCount: number
  updatedAt: string
  usedByCount: number
}

/** One environment of a set on the detail page (names, never values). */
export interface EnvironmentView {
  id: string
  name: string
  protected: boolean
  /** Variable names, in file order. */
  keys: string[]
  /** Flagged secret (always masked in logs). */
  secretKeys: string[]
  /** Explicitly flagged not secret; unmarked ones are in neither list. */
  plainKeys: string[]
  updatedAt: string
  usedBy: EnvironmentUser[]
}

interface VariableSetBase {
  id: string
  name: string
  /** Immutable; API token scopes name sets by slug. */
  slug: string
  description: string | null
  sharedWithAll: boolean
  /** Explicit shares the caller may see. */
  projects: { id: string; name: string }[]
  role: VariableSetRole
  /** Instance owner/admin: may rename, share, delete and add/delete environments. */
  canManage: boolean
  usage: { applications: number; composeApps: number }
  createdAt: string
  updatedAt: string
}

/** `GET /variable-sets` row. */
export interface VariableSetSummary extends VariableSetBase {
  environments: EnvironmentSummary[]
}

/** `GET /variable-sets/:id`. */
export interface VariableSetDetail extends VariableSetBase {
  environments: EnvironmentView[]
}

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

/** Key-level comparison of two environments of one set. */
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

/** One linked environment of an application or stack, in merge order. */
export interface LinkView {
  position: number
  environmentId: string
  environmentName: string
  protected: boolean
  setId: string
  setName: string
  setSlug: string
  keys: string[]
  /** Also defined by a later link, which wins. */
  shadowedKeys: string[]
  /** Defined by the owner's own env (and no later link). */
  overriddenByOwnEnv: string[]
}

/** A set shared with a project (`GET /projects/:id/variable-sets`). */
export interface ProjectVariableSet {
  id: string
  name: string
  slug: string
  description: string | null
  sharedWithAll: boolean
  environments: {
    id: string
    name: string
    protected: boolean
    keys: string[]
  }[]
  /** Owners in this project only. */
  usedBy: (EnvironmentUser & {
    environmentId: string
    environmentName: string
  })[]
}

/** Names that look like a secret; mirrors the API rule that flags a newly added variable. */
export const SECRET_NAME = /password|secret|token|key|private|credential/i

/** Environment names: same rule as the API. */
export const ENVIRONMENT_NAME = /^[a-z0-9-]{1,32}$/

/** Set slugs: same rule as the API (`VARIABLE_SET_SLUG`). */
export const VARIABLE_SET_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/

/** API token scope entries: `<slug>/<env>`, `<slug>/*` or `*` + `/<env>` (API `VARIABLE_SCOPE`). */
export const VARIABLE_SCOPE =
  /^(?:\*|[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)\/(?:\*|[a-z0-9-]{1,32})$/

/** At most this many scope entries per token. */
export const MAX_VARIABLE_SCOPES = 20

/** At most this many links per application or stack (API `MAX_LINKS`). */
export const MAX_LINKS = 10

/** At most this many environments per set. */
export const MAX_ENVIRONMENTS = 20

/** Variable names defined in a `KEY=VALUE` text (comments and blanks skipped). */
export function envKeys(text: string): string[] {
  const out: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line)
    if (m && !out.includes(m[1])) out.push(m[1])
  }
  return out
}

/**
 * Conflict hints for an ordered link list, the same rule as the API's
 * `linkConflicts`: a key is shadowed when a later link defines it too, and
 * overridden by the own env when the own env defines it and no later link does.
 */
export function linkConflicts(
  links: { keys: string[] }[],
  ownKeys: string[]
): { shadowedKeys: string[]; overriddenByOwnEnv: string[] }[] {
  const own = new Set(ownKeys)
  return links.map((link, i) => {
    const later = new Set(links.slice(i + 1).flatMap((l) => l.keys))
    return {
      shadowedKeys: link.keys.filter((k) => later.has(k)),
      overriddenByOwnEnv: link.keys.filter((k) => !later.has(k) && own.has(k)),
    }
  })
}

/** Whether a role may reveal / edit values of an environment (the API rule). */
export function canRevealEnvironment(
  role: VariableSetRole,
  env: { protected: boolean }
): boolean {
  if (role === "viewer") return false
  return !env.protected || role === "platform"
}
