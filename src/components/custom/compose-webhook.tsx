"use client"

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
}: {
  composeAppId: string
  webhook: WebhookInfo & { supported: boolean }
}) {
  return (
    <WebhookCard
      webhook={webhook}
      regenerate={() => regenerateComposeWebhookAction(composeAppId)}
      setSecret={(enabled) =>
        setComposeWebhookSecretAction(composeAppId, enabled)
      }
      note={
        webhook.supported ? undefined : (
          <>
            {" "}
            Stack ini dibuat dari template, jadi tidak ada repository yang bisa
            dipantau — push diabaikan.
          </>
        )
      }
    />
  )
}
