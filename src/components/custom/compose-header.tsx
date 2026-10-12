"use client"

import { Play, Rocket, Square, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { ComposeSourceIcon } from "@/components/custom/brand-icon"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import { useComposeLive } from "@/components/custom/compose-live"
import {
  ResourceHeader,
  ResourceStatus,
} from "@/components/custom/resource-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  deleteComposeAppAction,
  deployComposeAppAction,
  startComposeAppAction,
  stopComposeAppAction,
} from "@/features/compose/compose.actions"

/**
 * The compose page's header card. It reads the live stack from `ComposeLiveProvider`, so the
 * status badge and the Deploy, Stop/Start and Delete buttons follow every action and poll.
 */
export function ComposeHeader({
  backHref,
  backLabel,
}: {
  backHref: string
  backLabel: string
}) {
  const t = useTranslations("compose")
  const tc = useTranslations("common")
  const { app, pending, busy, error, run } = useComposeLive()

  return (
    <ResourceHeader
      backHref={backHref}
      backLabel={backLabel}
      icon={
        <ComposeSourceIcon
          source={app.source}
          gitUrl={app.gitUrl}
          className="size-5"
        />
      }
      title={app.name}
      badges={
        <>
          <ResourceStatus
            tone={
              app.status === "running"
                ? "success"
                : app.status === "error"
                  ? "danger"
                  : app.status === "deploying"
                    ? "warning"
                    : "neutral"
            }
          >
            {t(`statusStrip.status.${app.status}`)}
          </ResourceStatus>
          <Badge variant="outline">compose</Badge>
          {app.projectRole === "viewer" && (
            <Badge variant="outline">{t("statusStrip.readOnly")}</Badge>
          )}
        </>
      }
      meta={[
        <span key="s" className="font-mono">
          {app.source === "template"
            ? t("page.templateInfo", { id: app.templateId ?? "" })
            : `${(app.gitUrl ?? "").replace(/^https?:\/\//, "")}#${app.gitBranch}`}
        </span>,
        app.source !== "template" && (
          <span key="p" className="font-mono">
            {app.composePath}
          </span>
        ),
      ]}
      actions={
        app.projectRole !== "viewer" && (
          <>
            <Button
              disabled={pending || busy}
              onClick={() => run(() => deployComposeAppAction(app.id))}
            >
              <Rocket data-icon="inline-start" />
              {app.status === "idle"
                ? t("statusStrip.deploy")
                : t("statusStrip.redeploy")}
            </Button>
            {app.status === "running" && (
              <Button
                variant="outline"
                disabled={pending || busy}
                onClick={() => run(() => stopComposeAppAction(app.id))}
              >
                <Square data-icon="inline-start" />
                {tc("actions.stop")}
              </Button>
            )}
            {app.status === "stopped" && (
              <Button
                variant="outline"
                disabled={pending || busy}
                onClick={() => run(() => startComposeAppAction(app.id))}
              >
                <Play data-icon="inline-start" />
                {tc("actions.start")}
              </Button>
            )}
            <ConfirmDialog
              trigger={
                <Button variant="destructive" disabled={pending || busy}>
                  <Trash2 data-icon="inline-start" />
                  {tc("actions.delete")}
                </Button>
              }
              title={t("statusStrip.deleteTitle", { name: app.name })}
              description={t("statusStrip.deleteDescription")}
              confirmLabel={t("statusStrip.deleteConfirm")}
              onConfirm={() => deleteComposeAppAction(app.id, app.projectId)}
            />
            {error && (
              <span
                className="self-center text-xs text-destructive"
                role="alert"
              >
                {error}
              </span>
            )}
          </>
        )
      }
    />
  )
}
