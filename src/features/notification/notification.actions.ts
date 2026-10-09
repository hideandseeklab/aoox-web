"use server"

import { getTranslations } from "next-intl/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type {
  Notification,
  NotificationTestResult,
} from "./notification.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

async function fail(err: unknown): Promise<{ ok: false; error: string }> {
  const t = await getTranslations("settings")
  return {
    ok: false,
    error: err instanceof ApiError ? err.message : t("errors.unreachable"),
  }
}

type Translate = (key: string) => string

const schema = (t: Translate) => {
  const https = z
    .string()
    .trim()
    .url(t("validation.invalidUrl"))
    .startsWith("https://", t("validation.httpsRequired"))

  return z.discriminatedUnion("type", [
    z.object({
      type: z.literal("telegram"),
      botToken: z
        .string()
        .trim()
        .regex(/^\d+:[A-Za-z0-9_-]{30,}$/, t("validation.botTokenInvalid")),
      chatId: z
        .string()
        .trim()
        .regex(/^-?\d+$/, t("validation.chatIdNumeric")),
    }),
    z.object({ type: z.literal("slack"), webhookUrl: https }),
    z.object({ type: z.literal("discord"), webhookUrl: https }),
    z.object({
      type: z.literal("webhook"),
      url: z.string().trim().url(t("validation.invalidUrl")),
      // Empty = unsigned deliveries.
      secret: z.string().trim().max(200).optional(),
    }),
    z.object({
      type: z.literal("email"),
      smtpHost: z
        .string()
        .trim()
        .min(1, t("validation.smtpHostRequired"))
        .max(255),
      smtpPort: z.coerce.number().int().min(1).max(65535),
      smtpSecure: z.boolean(),
      smtpUsername: z.string().trim().max(255).optional(),
      smtpPassword: z.string().max(1024).optional(),
      from: z.string().trim().email(t("validation.senderInvalid")),
      // Comma/newline separated in the form.
      to: z
        .array(z.string().trim().email(t("validation.recipientInvalid")))
        .min(1, t("validation.recipientMin"))
        .max(20),
    }),
  ])
}

const base = (t: Translate) =>
  z.object({
    name: z.string().trim().min(1, t("validation.nameRequired")).max(100),
    onDeploymentStarted: z.boolean(),
    onDeploymentSuccess: z.boolean(),
    onDeploymentFailure: z.boolean(),
    onBackupFailure: z.boolean(),
    onJobFailure: z.boolean(),
    onDiskLow: z.boolean(),
    onCertificateFailure: z.boolean(),
    onContainerDown: z.boolean(),
    onDnsIssue: z.boolean(),
    onAppError: z.boolean(),
    onServerDown: z.boolean(),
    onHttpDown: z.boolean(),
  })

type Fields =
  | "name"
  | "botToken"
  | "chatId"
  | "webhookUrl"
  | "url"
  | "secret"
  | "smtpHost"
  | "smtpPort"
  | "smtpUsername"
  | "smtpPassword"
  | "from"
  | "to"

export interface NotificationFormState {
  error?: string
  fieldErrors?: Partial<Record<Fields, string[]>>
  values?: Partial<Record<Fields | "type", string>>
  created?: boolean
}

export async function createNotificationAction(
  _prev: NotificationFormState,
  formData: FormData
): Promise<NotificationFormState> {
  const str = (k: string) => String(formData.get(k) ?? "")
  const values = {
    name: str("name"),
    type: str("type") || "telegram",
    botToken: str("botToken"),
    chatId: str("chatId"),
    webhookUrl: str("webhookUrl"),
    url: str("url"),
    secret: str("secret"),
    smtpHost: str("smtpHost"),
    smtpPort: str("smtpPort") || "587",
    smtpUsername: str("smtpUsername"),
    from: str("from"),
    to: str("to"),
  }
  const t = await getTranslations("settings")
  const parsedBase = base(t).safeParse({
    name: values.name,
    onDeploymentStarted: formData.get("onDeploymentStarted") === "on",
    onDeploymentSuccess: formData.get("onDeploymentSuccess") === "on",
    onDeploymentFailure: formData.get("onDeploymentFailure") === "on",
    onBackupFailure: formData.get("onBackupFailure") === "on",
    onJobFailure: formData.get("onJobFailure") === "on",
    onDiskLow: formData.get("onDiskLow") === "on",
    onCertificateFailure: formData.get("onCertificateFailure") === "on",
    onContainerDown: formData.get("onContainerDown") === "on",
    onDnsIssue: formData.get("onDnsIssue") === "on",
    onAppError: formData.get("onAppError") === "on",
    onServerDown: formData.get("onServerDown") === "on",
    onHttpDown: formData.get("onHttpDown") === "on",
  })
  const parsedType = schema(t).safeParse({
    ...values,
    smtpSecure: formData.get("smtpSecure") === "on",
    smtpUsername: values.smtpUsername || undefined,
    smtpPassword: str("smtpPassword") || undefined,
    to: values.to
      .split(/[,;\n]+/)
      .map((t) => t.trim())
      .filter(Boolean),
  })
  if (!parsedBase.success || !parsedType.success) {
    const fieldErrors: NotificationFormState["fieldErrors"] = {}
    for (const issue of [
      ...(parsedBase.success ? [] : parsedBase.error.issues),
      ...(parsedType.success ? [] : parsedType.error.issues),
    ]) {
      const key = issue.path[0] as Fields
      ;(fieldErrors[key] ??= []).push(issue.message)
    }
    return { fieldErrors, values }
  }
  try {
    await api<Notification>("/notifications", {
      method: "POST",
      body: { ...parsedBase.data, ...parsedType.data },
      token: await requireToken(),
    })
  } catch (err) {
    return { error: (await fail(err)).error, values }
  }
  revalidatePath("/settings")
  return { created: true }
}

export async function deleteNotificationAction(
  id: string
): Promise<ActionResult> {
  try {
    await api<void>(`/notifications/${id}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath("/settings")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function testNotificationAction(
  id: string
): Promise<ActionResult<NotificationTestResult>> {
  try {
    const data = await api<NotificationTestResult>(
      `/notifications/${id}/test`,
      { method: "POST", token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}
