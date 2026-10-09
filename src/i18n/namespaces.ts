/**
 * Every message namespace. One namespace = one file per language:
 * `messages/<locale>/<namespace>.json` (the file holds the namespace's keys directly,
 * without a wrapper). Add the name here AND create the file in both languages;
 * `npm run check:i18n` fails when the list and the files disagree.
 *
 * Ownership by area keeps two people from editing the same file:
 * - shell (stage 1): nav, breadcrumb, inbox, commandPalette, userMenu
 * - shared: common (buttons, states, generic messages), logViewer
 * - zod / server-action messages live in the namespace of their area, under a `validation.*` sub-key
 * - one area each: auth, dashboard, projects, applications, compose, database,
 *   settings, infra, docker, registry, terminal, templates
 */
export const NAMESPACES = [
  "nav",
  "breadcrumb",
  "inbox",
  "commandPalette",
  "userMenu",
  "common",
  "logViewer",
  "auth",
  "dashboard",
  "projects",
  "applications",
  "compose",
  "database",
  "settings",
  "infra",
  "docker",
  "registry",
  "terminal",
  "templates",
] as const

export type Namespace = (typeof NAMESPACES)[number]
