import { formatBytes } from "@/features/monitoring/monitoring.entity"
import { formatDate } from "@/i18n/format"
import type { InboxItem, InboxParams } from "./inbox.entity"

/** What the `inbox` namespace translator offers (`useTranslations("inbox")` fits). */
export interface InboxTranslator {
  (key: string, values?: Record<string, string | number>): string
  has(key: string): boolean
}

type Values = Record<string, string | number>

const str = (p: InboxParams, k: string): string | null => {
  const v = p[k]
  return typeof v === "string" && v !== "" ? v : null
}
const num = (p: InboxParams, k: string): number | null => {
  const v = p[k]
  return typeof v === "number" && Number.isFinite(v) ? v : null
}
const flag = (p: InboxParams, k: string): "true" | "false" => (p[k] === true ? "true" : "false")
/** ICU `select` needs a word for "absent": messages use `none` for it. */
const orNone = (v: string | number | null): string | number => v ?? "none"

interface Ctx {
  t: InboxTranslator
  locale: string
}

/** "45s", "3m 20s", "2h 5m" in the active language. */
function duration(seconds: number | null, { t }: Ctx): string | null {
  if (seconds === null) return null
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return t("duration.seconds", { seconds: s })
  const m = Math.floor(s / 60)
  if (m < 60)
    return s % 60 === 0
      ? t("duration.wholeMinutes", { minutes: m })
      : t("duration.minutes", { minutes: m, seconds: s % 60 })
  return m % 60 === 0
    ? t("duration.wholeHours", { hours: m / 60 })
    : t("duration.hours", { hours: Math.floor(m / 60), minutes: m % 60 })
}

/**
 * Builds the message values for one event (+ variant) from its `params`, or
 * returns null when a value the sentence needs is missing. A null result makes
 * the caller fall back to the title/summary the API sent.
 */
type Builder = (p: InboxParams, ctx: Ctx) => Values | null

const kindOf = (p: InboxParams) => (str(p, "kind") === "rollback" ? "rollback" : "deployment")
const triggerOf = (p: InboxParams) => (str(p, "trigger") === "scheduled" ? "scheduled" : "manual")

function needs(values: Record<string, string | number | null>): Values | null {
  const out: Values = {}
  for (const [k, v] of Object.entries(values)) {
    if (v === null) return null
    out[k] = v
  }
  return out
}

const BUILDERS: Record<string, Builder> = {
  deploymentStarted: (p) => {
    const application = str(p, "application")
    const project = str(p, "project")
    if (!application || !project) return null
    const sha = str(p, "commitSha")
    const message = str(p, "commitMessage")
    const commit = sha ? (message ? `${sha} “${message.slice(0, 80)}”` : sha) : null
    return {
      kind: kindOf(p),
      application,
      project,
      trigger:
        str(p, "trigger") === "webhook"
          ? "webhook"
          : str(p, "trigger") === "auto-update"
            ? "autoUpdate"
            : "manual",
      by: orNone(str(p, "triggeredBy")),
      commit: orNone(commit),
    }
  },
  deploymentSuccess: (p, ctx) => {
    const application = str(p, "application")
    const project = str(p, "project")
    if (!application || !project) return null
    return {
      kind: kindOf(p),
      application,
      project,
      duration: orNone(duration(num(p, "durationSeconds"), ctx)),
    }
  },
  deploymentFailure: (p, ctx) => {
    const application = str(p, "application")
    const project = str(p, "project")
    if (!application || !project) return null
    return {
      kind: kindOf(p),
      application,
      project,
      duration: orNone(duration(num(p, "durationSeconds"), ctx)),
      error: orNone(str(p, "error")),
    }
  },
  "deploymentFailure.compose": (p) => {
    const stack = str(p, "stack")
    if (!stack) return null
    return {
      stack,
      source: str(p, "source") === "template" ? "template" : "git",
      error: orNone(str(p, "error")),
    }
  },
  "backupFailure.database": (p) => {
    const database = str(p, "database")
    if (!database) return null
    return {
      database,
      engine: orNone(str(p, "engine")),
      trigger: triggerOf(p),
      error: orNone(str(p, "error")),
    }
  },
  "backupFailure.volume": (p) => {
    const application = str(p, "application")
    const volume = str(p, "volume")
    if (!application || !volume) return null
    return { application, volume, trigger: triggerOf(p), error: orNone(str(p, "error")) }
  },
  "backupFailure.instance": (p) => ({ trigger: triggerOf(p), error: orNone(str(p, "error")) }),
  jobFailure: (p) => {
    const job = str(p, "job")
    if (!job) return null
    return { job, status: str(p, "status") === "timeout" ? "timeout" : "failed" }
  },
  "containerDown.application": (p) => {
    const application = str(p, "application")
    const project = str(p, "project")
    const exitCode = num(p, "exitCode")
    if (!application || !project || exitCode === null) return null
    return {
      application,
      project,
      exitCode,
      restarting: flag(p, "restarting"),
      server: orNone(str(p, "server")),
    }
  },
  "containerDown.task": (p) =>
    needs({
      application: str(p, "application"),
      project: str(p, "project"),
      running: num(p, "running"),
      desired: num(p, "desired"),
    }),
  "containerDown.database": (p) => {
    const database = str(p, "database")
    const exitCode = num(p, "exitCode")
    if (!database || exitCode === null) return null
    return { database, exitCode, restarting: flag(p, "restarting") }
  },
  "containerDown.stack": (p) => {
    const stack = str(p, "stack")
    const service = str(p, "service")
    const exitCode = num(p, "exitCode")
    if (!stack || !service || exitCode === null) return null
    return { stack, service, exitCode, restarting: flag(p, "restarting") }
  },
  "containerDown.replicas": (p) =>
    needs({
      application: str(p, "application"),
      project: str(p, "project"),
      running: num(p, "running"),
      desired: num(p, "desired"),
    }),
  diskLow: (p) => {
    const usedPercent = num(p, "usedPercent")
    const used = num(p, "usedBytes")
    const total = num(p, "totalBytes")
    const free = num(p, "availableBytes")
    const threshold = num(p, "thresholdPercent")
    if ([usedPercent, used, total, free, threshold].includes(null)) return null
    return {
      usedPercent: usedPercent as number,
      used: formatBytes(used as number),
      total: formatBytes(total as number),
      free: formatBytes(free as number),
      threshold: threshold as number,
    }
  },
  "certificateFailure.expired": (p, { locale }) => certificateWindow(p, locale),
  "certificateFailure.expiring": (p, { locale }) => certificateWindow(p, locale),
  "certificateFailure.acme": (p) => {
    const domain = str(p, "domain")
    if (!domain) return null
    return { domain, reason: orNone(str(p, "reason")) }
  },
  dnsIssue: (p) => {
    const domain = str(p, "domain")
    const application = str(p, "application")
    const project = str(p, "project")
    if (!domain || !application || !project) return null
    return {
      domain,
      application,
      project,
      status: str(p, "status") === "unresolved" ? "unresolved" : "mismatch",
    }
  },
  appError: (p) => {
    const application = str(p, "application")
    const project = str(p, "project")
    const count = num(p, "count")
    if (!application || !project || count === null) return null
    return { application, project, count }
  },
  "serverDown.down": (p) => {
    const server = str(p, "server")
    if (!server) return null
    return { server, reminder: flag(p, "reminder"), error: orNone(str(p, "error")) }
  },
  "serverDown.recovered": (p, ctx) => {
    const server = str(p, "server")
    if (!server) return null
    return { server, downFor: orNone(duration(num(p, "downSeconds"), ctx)) }
  },
  "httpDown.down": (p) => {
    const application = str(p, "application")
    const target = str(p, "target")
    if (!application || !target) return null
    return {
      application,
      project: orNone(str(p, "project")),
      target,
      reminder: flag(p, "reminder"),
      error: orNone(str(p, "error")),
      failedChecks: orNone(num(p, "failedChecks")),
    }
  },
  "httpDown.recovered": (p, ctx) => {
    const application = str(p, "application")
    if (!application) return null
    return {
      application,
      project: orNone(str(p, "project")),
      downFor: orNone(duration(num(p, "downSeconds"), ctx)),
    }
  },
}

function certificateWindow(p: InboxParams, locale: string): Values | null {
  const certificate = str(p, "certificate")
  const domains = str(p, "domains")
  const notAfter = str(p, "notAfter")
  if (!certificate || !notAfter) return null
  const when = new Date(notAfter)
  if (Number.isNaN(when.getTime())) return null
  return {
    certificate,
    domains: orNone(domains),
    date: formatDate(when, locale, { dateStyle: "medium", timeZone: "UTC" }),
  }
}

/**
 * The inbox line in the active language, composed from the event, its variant
 * and structured `params`. Null when the row has no params (older events), the
 * event or variant is unknown, or a needed value is missing: show the API's
 * own English `title`/`summary` then.
 */
export function describeInboxItem(
  item: Pick<InboxItem, "event" | "params">,
  ctx: Ctx
): { title: string; summary: string } | null {
  const p = item.params
  if (!p) return null
  const variant = str(p, "variant")
  const key = variant ? `${item.event}.${variant}` : item.event
  const build = BUILDERS[key]
  if (!build) return null
  const values = build(p, ctx)
  if (!values) return null
  const base = `events.${key}`
  if (!ctx.t.has(`${base}.title`)) return null
  const title = ctx.t(`${base}.title`, values)
  const summary = ctx.t.has(`${base}.summary`) ? ctx.t(`${base}.summary`, values).trim() : ""
  return { title, summary }
}
