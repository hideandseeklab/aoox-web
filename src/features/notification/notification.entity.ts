/** Mirrors NotificationDto in aoox-api (notification.service.ts). */
export type NotificationType =
  "telegram" | "slack" | "discord" | "webhook" | "email"

export interface Notification {
  id: string
  name: string
  type: NotificationType
  /** Masked target (chat id / webhook host) for recognition only. */
  targetHint: string
  onDeploymentSuccess: boolean
  onDeploymentFailure: boolean
  onBackupFailure: boolean
  onJobFailure: boolean
  onDiskLow: boolean
  onCertificateFailure: boolean
  onDnsIssue: boolean
  onContainerDown: boolean
  createdAt: string
}

export interface NotificationTestResult {
  ok: boolean
  message: string
}
