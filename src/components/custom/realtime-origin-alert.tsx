"use client"

import { ExternalLink } from "lucide-react"
import { useTranslations } from "next-intl"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

/**
 * Shown on the application's Deploy and Logs tabs when the page is opened
 * from another origin than the panel's `WEB_ORIGIN`: the `/logs` gateway
 * rejects such connections, so the realtime features stay off.
 */
export function RealtimeOriginAlert({
  webOrigin,
  browserOrigin,
}: {
  webOrigin: string
  browserOrigin: string
}) {
  const t = useTranslations("applications")
  return (
    <Alert variant="destructive">
      <AlertTitle>{t("realtimeOrigin.title")}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          {t.rich("realtimeOrigin.body", {
            code: (chunks) => <code>{chunks}</code>,
            webOrigin,
            browserOrigin,
          })}
        </p>
        <Button size="sm" asChild>
          <a
            href={webOrigin + window.location.pathname + window.location.search}
          >
            <ExternalLink data-icon="inline-start" />
            {t("realtimeOrigin.open", { origin: webOrigin })}
          </a>
        </Button>
      </AlertDescription>
    </Alert>
  )
}
