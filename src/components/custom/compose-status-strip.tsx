"use client"

import { Play, Rocket, Square, Trash2 } from "lucide-react"
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
 * source line (`info`, built by the page) on the left; Deploy, Stop/Start and Hapus on the right,
 * exactly the buttons and rules the Deploy tab's toolbar had.
 */
export function ComposeStatusStrip({ info }: { info: ReactNode }) {
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
            {app.status === "deploying" ? "berjalan…" : app.status}
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
            {app.status === "idle" ? "Deploy" : "Deploy ulang"}
          </Button>
          {app.status === "running" && (
            <Button
              size="sm"
              variant="outline"
              disabled={pending || busy}
              onClick={() => run(() => stopComposeAppAction(app.id))}
            >
              <Square data-icon="inline-start" />
              Stop
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
              Start
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
                Hapus
              </Button>
            }
            title={`Hapus stack ${app.name}?`}
            description="Semua container stack dihentikan dan dihapus, beserta volume datanya dan salinan checkout-nya. Data di volume hilang permanen dan tidak bisa dibatalkan."
            confirmLabel="Hapus stack"
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
