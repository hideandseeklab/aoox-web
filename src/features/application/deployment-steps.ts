import { formatNumber } from "@/i18n/format"
import type {
  DeploymentStatus,
  DeploymentStepTimes,
  DeploymentSummary,
} from "./application.entity"

/** One column of the stepper. `key` is the status that makes the step active. */
export type StepKey =
  "queued" | "building" | "pushing" | "starting" | "finished"

export type StepState = "done" | "active" | "failed" | "pending"

/** Translation key (under `stepper.steps`) of a step label. */
export type StepLabelKey =
  "queued" | "pull" | "build" | "push" | "start" | "finished" | "failed"

export interface StepView {
  key: StepKey
  labelKey: StepLabelKey
  state: StepState
  /** Milliseconds the step took (or has taken so far while active); null when unknown. */
  durationMs: number | null
}

interface StepInput {
  deployment: Pick<
    DeploymentSummary,
    "kind" | "status" | "createdAt" | "finishedAt" | "stepTimes"
  >
  /** What the application is built from; decides Build vs Pull. */
  sourceType: "git" | "image"
  /** Remote servers build locally and never push. */
  remote: boolean
  /** Status the live socket reported, when newer than the row. */
  liveStatus?: string | null
  /** Step start times seen live (merged over the row's, first one wins). */
  liveTimes?: DeploymentStepTimes & { finished?: string }
  now: number
}

const TIMED: StepKey[] = ["building", "pushing", "starting"]

/** Which steps a deployment goes through, by what it actually does. */
function stepsFor(i: StepInput): { key: StepKey; labelKey: StepLabelKey }[] {
  const steps: { key: StepKey; labelKey: StepLabelKey }[] = [
    { key: "queued", labelKey: "queued" },
  ]
  const { kind, stepTimes } = i.deployment
  if (kind === "build" || kind === "auto-update") {
    if (i.sourceType === "image") {
      steps.push({ key: "building", labelKey: "pull" })
    } else {
      steps.push({ key: "building", labelKey: "build" })
      // A push that really happened stays visible even if the app moved servers since.
      if (!i.remote || stepTimes?.pushing) {
        steps.push({ key: "pushing", labelKey: "push" })
      }
    }
  }
  steps.push({ key: "starting", labelKey: "start" })
  steps.push({ key: "finished", labelKey: "finished" })
  return steps
}

/**
 * The stepper's data, derived from the row (`stepTimes`, `createdAt`,
 * `finishedAt`) plus what the live socket has said since. Deployments from
 * before step times were recorded still render: states come from `status`
 * alone and durations are null. Pure; unit-tested.
 */
export function buildSteps(i: StepInput): StepView[] {
  const status = (i.liveStatus ?? i.deployment.status) as DeploymentStatus
  const terminal = status === "success" || status === "failed"
  const times: Partial<Record<StepKey, number>> = {
    queued: Date.parse(i.deployment.createdAt),
  }
  const merged = { ...i.deployment.stepTimes, ...i.liveTimes }
  for (const k of TIMED) {
    const t = merged[k as keyof DeploymentStepTimes]
    if (t) times[k] = Date.parse(t)
  }
  const finishedIso = i.deployment.finishedAt ?? i.liveTimes?.finished
  if (finishedIso) times.finished = Date.parse(finishedIso)

  const steps = stepsFor(i)
  const hasTimes = TIMED.some((k) => times[k] !== undefined)
  // The step that was running when it failed: the last one that started.
  let failedIndex = -1
  if (status === "failed" && hasTimes) {
    steps.forEach((s, idx) => {
      if (s.key !== "finished" && times[s.key] !== undefined) failedIndex = idx
    })
  }
  const activeIndex = terminal
    ? -1
    : steps.findIndex((s) => s.key === (status as StepKey))

  return steps.map((s, idx) => {
    let state: StepState = "pending"
    if (s.key === "finished") {
      state = status === "success" ? "done" : "pending"
      // Failed, but the row has no step times to say which step: show the end as failed.
      if (status === "failed" && failedIndex < 0) state = "failed"
    } else if (idx === failedIndex) {
      state = "failed"
    } else if (idx === activeIndex) {
      state = "active"
    } else if (status === "success") {
      state = "done"
    } else if (status === "failed") {
      // Without step times we cannot tell how far it got.
      state = failedIndex >= 0 && idx < failedIndex ? "done" : "pending"
    } else if (activeIndex >= 0 && idx < activeIndex) {
      state = "done"
    }

    let durationMs: number | null = null
    const start = times[s.key]
    // Without any recorded step time a duration would just be "created to finished": leave it out.
    if (
      hasTimes &&
      s.key !== "finished" &&
      start !== undefined &&
      !Number.isNaN(start)
    ) {
      const next = steps
        .slice(idx + 1)
        .map((n) => times[n.key])
        .find((t) => t !== undefined && !Number.isNaN(t))
      if (state === "active") durationMs = Math.max(0, i.now - start)
      else if (next !== undefined) durationMs = Math.max(0, next - start)
    }
    const labelKey: StepLabelKey =
      s.key === "finished" && state === "failed" ? "failed" : s.labelKey
    return { key: s.key, labelKey, state, durationMs }
  })
}

type Translator = (key: string, values?: Record<string, string | number>) => string

/** "850 ms", "3.2 s", "1 min 5 s"; `t` is the `applications` translator. */
export function formatDuration(
  ms: number,
  locale: string,
  t: Translator
): string {
  if (ms < 1000) return t("stepper.duration.ms", { value: Math.round(ms) })
  const s = ms / 1000
  if (s < 60) {
    const value = formatNumber(s, locale, {
      minimumFractionDigits: s < 10 ? 1 : 0,
      maximumFractionDigits: s < 10 ? 1 : 0,
    })
    return t("stepper.duration.seconds", { value })
  }
  const minutes = Math.floor(s / 60)
  const seconds = Math.round(s - minutes * 60)
  return seconds > 0
    ? t("stepper.duration.minutesSeconds", { minutes, seconds })
    : t("stepper.duration.minutes", { minutes })
}

/** Whole-deployment duration for the history list; null when it has not finished. */
export function totalDuration(d: {
  createdAt: string
  finishedAt: string | null
}): number | null {
  if (!d.finishedAt) return null
  const ms = Date.parse(d.finishedAt) - Date.parse(d.createdAt)
  return Number.isNaN(ms) ? null : Math.max(0, ms)
}
