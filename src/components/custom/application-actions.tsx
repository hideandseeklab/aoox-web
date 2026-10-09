"use client"

import { Play, Rocket, Square } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  deployApplicationAction,
  startApplicationAction,
  stopApplicationAction,
} from "@/features/application/application.actions"
import {
  ACTIVE_DEPLOYMENT_STATUSES,
  type ApplicationDetail,
  type DeploymentStatus,
  type DeploymentSummary,
} from "@/features/application/application.entity"

/** Fired after a deploy is queued so the Deploy tab's log view can select the new deployment. */
export const DEPLOYMENT_QUEUED_EVENT = "aoox:deployment-queued"

/**
 * Deploy and Stop/Start for the application's status strip. Same buttons, labels, rules and actions
 * the Deploy tab's toolbar had; a failure message sits beside them.
 */
export function ApplicationStatusActions({
  app,
  deployments,
}: {
  app: ApplicationDetail
  deployments: DeploymentSummary[]
}) {
  const t = useTranslations("applications")
  const tc = useTranslations("common")
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const running = app.container?.state === "running"
  const active = deployments.some((d) =>
    ACTIVE_DEPLOYMENT_STATUSES.includes(d.status as DeploymentStatus)
  )

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? t("actions.failed"))
      else router.refresh()
    })

  return (
    <>
      <Button
        disabled={pending || active}
        onClick={() =>
          run(async () => {
            const r = await deployApplicationAction(app.id)
            if (r.ok)
              window.dispatchEvent(
                new CustomEvent(DEPLOYMENT_QUEUED_EVENT, {
                  detail: { id: r.data.id },
                })
              )
            return r
          })
        }
      >
        <Rocket data-icon="inline-start" />
        {active ? t("actions.deploying") : t("actions.deploy")}
      </Button>
      {app.container &&
        (running ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => stopApplicationAction(app.id))}
          >
            <Square data-icon="inline-start" />
            {tc("actions.stop")}
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => startApplicationAction(app.id))}
          >
            <Play data-icon="inline-start" />
            {tc("actions.start")}
          </Button>
        ))}
      {error && (
        <span className="self-center text-xs text-destructive" role="alert">
          {error}
        </span>
      )}
    </>
  )
}
