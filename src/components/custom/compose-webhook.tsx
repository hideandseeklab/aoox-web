"use client"

import { useTranslations } from "next-intl"
import { WebhookCard } from "@/components/custom/webhook-card"
import {
  regenerateComposeWebhookAction,
  setComposeWebhookSecretAction,
} from "@/features/compose/compose.actions"
import type { WebhookInfo } from "@/features/application/application.entity"

/** Same card applications use; a template stack gets the "no repo" note. */
export function ComposeWebhook({
  composeAppId,
  webhook,
  canEdit = true,
}: {
  composeAppId: string
  webhook: WebhookInfo & { supported: boolean }
  canEdit?: boolean
}) {
  const t = useTranslations("compose")
  return (
    <WebhookCard
      webhook={webhook}
      canEdit={canEdit}
      regenerate={() => regenerateComposeWebhookAction(composeAppId)}
      setSecret={(enabled) =>
        setComposeWebhookSecretAction(composeAppId, enabled)
      }
      note={
        webhook.supported ? undefined : (
          <>
            {" "}
            {t("webhook.templateNote")}
          </>
        )
      }
    />
  )
}
