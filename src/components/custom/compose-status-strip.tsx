"use client"

import { Play, Rocket, Square, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import type { ReactNode } from "react"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import { useComposeLive } from "@/components/custom/compose-live"
import { StatusStrip } from "@/components/custom/status-strip"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  deleteComposeAppAction,
  deployComposeAppAction,
  startComposeAppAction,
  stopComposeAppAction,
} from "@/features/compose/compose.actions"

/**
 * The compose page's status line under the tabs: the live status badge, the `compose` badge and the
 * source line (`info`, built by the page) on the left; Deploy, Stop/Start and Delete on the right,
 * exactly the buttons and rules the Deploy tab's toolbar had.
 */
export function ComposeStatusStrip({ info }: { info: ReactNode }) {
  const t = useTranslations("compose")
  const tc = useTranslations("common")
  const { app, pending, busy, error, run } = useComposeLive()

  return (
    <StatusStrip
      className="pt-4"
      status={
        <>
          <Badge
            variant={
              app.status === "running"
                ? "default"
                : app.status === "error"
                  ? "destructive"
                  : "secondary"
            }
          >
            {t(`statusStrip.status.${app.status}`)}
          </Badge>
          <Badge variant="outline">compose</Badge>
        </>
      }
      info={info}
      actions={
        <>
          <Button
            size="sm"
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
              size="sm"
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
              size="sm"
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
              <Button
                size="sm"
                variant="destructive"
                disabled={pending || busy}
              >
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
            <span className="self-center text-xs text-destructive" role="alert">
              {error}
            </span>
          )}
        </>
      }
    />
  )
}
