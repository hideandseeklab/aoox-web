"use client"

import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId, useRef, useState } from "react"
import { toast } from "sonner"
import { IllustratedEmptyState } from "@/components/custom/illustrated-empty-state"
import { MaintenanceIllustration } from "@/components/custom/illustrations/maintenance-illustration"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { setMaintenanceAction } from "@/features/application/application.actions"

/** Mirrors MAINTENANCE_MESSAGE_MAX in aoox-api (maintenance-page.ts). */
const MESSAGE_MAX = 280

/**
 * Maintenance mode in the Settings tab: the switch publishes at once with the
 * text in the box; the text is saved with its own button while the switch is
 * left as it is. Viewers see the state only. The API does the routing.
 */
export function ApplicationMaintenance({
  applicationId,
  enabled,
  message,
  canEdit,
  remote,
}: {
  applicationId: string
  enabled: boolean
  message: string | null
  canEdit: boolean
  /** Remote-server apps are refused by the API; the card says so. */
  remote: boolean
}) {
  const t = useTranslations("applications.maintenance")
  const [saved, setSaved] = useState({ enabled, message: message ?? "" })
  const [text, setText] = useState(message ?? "")
  const [busy, setBusy] = useState<"switch" | "message" | null>(null)
  const toastId = useRef<string | number | null>(null)
  const ids = { switch: useId(), message: useId() }

  const dirty = text !== saved.message
  const locked = !canEdit || remote

  async function publish(next: { enabled: boolean; message: string }, kind: "switch" | "message") {
    setBusy(kind)
    toastId.current = toast.loading(t("toast.saving"))
    const r = await setMaintenanceAction(applicationId, next)
    if (r.ok) {
      setSaved({ enabled: r.data.enabled, message: r.data.message ?? "" })
      setText(r.data.message ?? "")
      toast.success(
        kind === "message"
          ? t("toast.saved")
          : r.data.enabled
            ? t("toast.on")
            : t("toast.off"),
        { id: toastId.current }
      )
    } else {
      toast.error(r.error, { id: toastId.current })
    }
    setBusy(null)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">{t("title")}</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor={ids.switch} className="text-xs">
              {t("switch")}
            </Label>
            <Switch
              id={ids.switch}
              checked={saved.enabled}
              disabled={locked || busy !== null}
              onCheckedChange={(v) =>
                void publish({ enabled: v, message: text.trim() }, "switch")
              }
            />
          </div>
        </div>
        <CardDescription className="max-w-3xl">
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {saved.enabled && (
          <IllustratedEmptyState
            className="rounded-lg border border-dashed py-6"
            illustration={<MaintenanceIllustration />}
            title={t("active.title")}
            description={t("active.body")}
            actions={
              !locked ? (
                <Button
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() =>
                    void publish({ enabled: false, message: text.trim() }, "switch")
                  }
                >
                  {busy === "switch" && (
                    <Loader2 data-icon="inline-start" className="animate-spin" />
                  )}
                  {t("active.turnOff")}
                </Button>
              ) : undefined
            }
          />
        )}
        {remote && (
          <p className="text-xs text-muted-foreground">{t("remote")}</p>
        )}
        <div className="space-y-1">
          <Label htmlFor={ids.message} className="text-xs">
            {t("message")}
          </Label>
          <Textarea
            id={ids.message}
            value={text}
            rows={3}
            maxLength={MESSAGE_MAX}
            disabled={locked || busy !== null}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("placeholder")}
            className="text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {t("messageHint", { max: MESSAGE_MAX })}{" "}
            <span className="tabular-nums">
              {t("counter", { count: text.length, max: MESSAGE_MAX })}
            </span>
          </p>
          {canEdit && !remote && (
            <Button
              onClick={() =>
                void publish({ enabled: saved.enabled, message: text.trim() }, "message")
              }
              disabled={!dirty || busy !== null}
            >
              {busy === "message" && (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              )}
              {t("save")}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t("scope")}</p>
      </CardContent>
    </Card>
  )
}
