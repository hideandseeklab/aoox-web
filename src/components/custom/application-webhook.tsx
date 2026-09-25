"use client"

import { WebhookCard } from "@/components/custom/webhook-card"
import {
  regenerateWebhookAction,
  setWebhookSecretAction,
} from "@/features/application/application.actions"
import type { WebhookInfo } from "@/features/application/application.entity"

export function ApplicationWebhook({
  applicationId,
  webhook,
}: {
  applicationId: string
  webhook: WebhookInfo
}) {
  return (
    <WebhookCard
      webhook={webhook}
      regenerate={() => regenerateWebhookAction(applicationId)}
      setSecret={(enabled) => setWebhookSecretAction(applicationId, enabled)}
    />
  )
}
