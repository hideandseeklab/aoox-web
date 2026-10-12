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
  canEdit = true,
}: {
  applicationId: string
  webhook: WebhookInfo
  canEdit?: boolean
}) {
  return (
    <WebhookCard
      webhook={webhook}
      canEdit={canEdit}
      regenerate={() => regenerateWebhookAction(applicationId)}
      setSecret={(enabled) => setWebhookSecretAction(applicationId, enabled)}
    />
  )
}
