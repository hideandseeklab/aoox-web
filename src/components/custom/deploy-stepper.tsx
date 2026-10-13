"use client"

import { Check, Circle, Loader2, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import {
  buildSteps,
  formatDuration,
  type StepState,
} from "@/features/application/deployment-steps"
import type {
  DeploymentStepTimes,
  DeploymentSummary,
} from "@/features/application/application.entity"

const ICON_CLASS: Record<StepState, string> = {
  done: "bg-primary/15 text-primary",
  active: "bg-primary/15 text-primary",
  failed: "bg-destructive/15 text-destructive",
  pending: "bg-muted text-muted-foreground",
}

/**
 * Queued → Build/Pull → Push → Start → Done for one deployment, with the
 * time each step took. The active step spins (only when the user allows
 * motion) and its time keeps counting; a failed deployment marks the step
 * that was running. Older deployments without step times show the states
 * without durations.
 */
export function DeployStepper({
  deployment,
  sourceType,
  remote,
  liveStatus,
  liveTimes,
}: {
  deployment: DeploymentSummary
  sourceType: "git" | "image"
  remote: boolean
  liveStatus?: string | null
  liveTimes?: DeploymentStepTimes & { finished?: string }
}) {
  const t = useTranslations("applications")
  const locale = useLocale()
  const status = liveStatus ?? deployment.status
  const running = status !== "success" && status !== "failed"
  // Re-render every second only while something is running (the active step's time).
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [running])

  const steps = buildSteps({
    deployment,
    sourceType,
    remote,
    liveStatus,
    liveTimes,
    now,
  })

  return (
    <ol
      aria-label={t("stepper.ariaLabel")}
      className="flex flex-wrap items-start gap-x-5 gap-y-2 rounded-md border px-3 py-2 text-xs"
    >
      {steps.map((s) => (
        // Icons align to the label's first line (the label line is as tall as
        // the icon), so every icon sits on one line whether or not a duration
        // line follows.
        <li key={s.key} className="flex items-start gap-2">
          <span
            className={`flex size-5 shrink-0 items-center justify-center rounded-full ${ICON_CLASS[s.state]}`}
          >
            {s.state === "done" && <Check className="size-3" aria-hidden />}
            {s.state === "active" && (
              <Loader2
                className="size-3 motion-safe:animate-spin"
                aria-hidden
              />
            )}
            {s.state === "failed" && <X className="size-3" aria-hidden />}
            {s.state === "pending" && (
              <Circle className="size-1.5 fill-current" aria-hidden />
            )}
          </span>
          <span>
            <span
              className={`block leading-5 ${
                s.state === "pending" ? "text-muted-foreground" : "font-medium"
              }`}
            >
              {t(`stepper.steps.${s.labelKey}`)}
              <span className="sr-only"> ({t(`stepper.state.${s.state}`)})</span>
            </span>
            {s.durationMs !== null && (
              <span className="block leading-tight text-muted-foreground tabular-nums">
                {formatDuration(s.durationMs, locale, t)}
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  )
}
