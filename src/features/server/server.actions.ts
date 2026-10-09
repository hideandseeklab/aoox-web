"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { z } from "zod"
import { requireToken } from "@/features/auth/auth.session"
import type { ProxyStatus } from "@/features/proxy/proxy.entity"
import { api, ApiError } from "@/lib/api"
import type { Server, ServerTestResult } from "./server.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

type Translator = Awaited<ReturnType<typeof getTranslations>>

const buildSchema = (t: Translator) =>
  z.object({
    name: z.string().trim().min(1, t("nameRequired")).max(100),
    host: z
      .string()
      .trim()
      .min(1, t("hostRequired"))
      .max(255)
      .regex(/^[a-z0-9.:-]+$/i, t("hostInvalid")),
    port: z.coerce.number().int().min(1).max(65535),
    username: z
      .string()
      .trim()
      .min(1, t("usernameRequired"))
      .max(64)
      .regex(/^[a-z_][a-z0-9_.-]*$/i, t("usernameInvalid")),
    privateKey: z.string().trim().max(16384).optional(),
  })

type Fields = "name" | "host" | "port" | "username" | "privateKey"

export interface ServerFormState {
  error?: string
  fieldErrors?: Partial<Record<Fields, string[]>>
  values?: Record<Exclude<Fields, "privateKey">, string>
  created?: boolean
}

export async function createServerAction(
  _prev: ServerFormState,
  formData: FormData
): Promise<ServerFormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    host: String(formData.get("host") ?? ""),
    port: String(formData.get("port") || "22"),
    username: String(formData.get("username") ?? ""),
  }
  const schema = buildSchema(await getTranslations("infra.validation.server"))
  const parsed = schema.safeParse({
    ...values,
    privateKey: String(formData.get("privateKey") ?? "") || undefined,
  })
  if (!parsed.success) {
    const fieldErrors: ServerFormState["fieldErrors"] = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as Fields
      ;(fieldErrors[key] ??= []).push(issue.message)
    }
    return { fieldErrors, values }
  }
  try {
    await api<Server>("/servers", {
      method: "POST",
      body: parsed.data,
      token: await requireToken(),
    })
  } catch (err) {
    return {
      error:
        err instanceof ApiError
          ? err.message
          : (await getTranslations("infra.errors"))("serverUnreachable"),
      values,
    }
  }
  revalidatePath("/settings")
  revalidatePath("/terminal")
  return { created: true }
}

export async function deleteServerAction(id: string): Promise<ActionResult> {
  try {
    await api<void>(`/servers/${id}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath("/settings")
    revalidatePath("/terminal")
    return { ok: true, data: undefined }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof ApiError
          ? err.message
          : (await getTranslations("infra.errors"))("serverUnreachable"),
    }
  }
}

export async function testServerAction(
  id: string
): Promise<ActionResult<ServerTestResult>> {
  try {
    const data = await api<ServerTestResult>(`/servers/${id}/test`, {
      method: "POST",
      token: await requireToken(),
    })
    return { ok: true, data }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof ApiError
          ? err.message
          : (await getTranslations("infra.errors"))("serverUnreachable"),
    }
  }
}

export interface ServerProxyInput {
  httpPort: number
  httpsPort: number
  acmeEmail: string | null
  acmeStaging: boolean
}

/** (Re)provisions Traefik on the server with these settings. */
export async function provisionServerProxyAction(
  id: string,
  input: ServerProxyInput
): Promise<ActionResult<ProxyStatus>> {
  try {
    const data = await api<ProxyStatus>(`/servers/${id}/proxy`, {
      method: "POST",
      body: input,
      token: await requireToken(),
    })
    revalidatePath("/settings")
    return { ok: true, data }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof ApiError
          ? err.message
          : (await getTranslations("infra.errors"))("serverUnreachable"),
    }
  }
}

export async function serverProxyStatusAction(
  id: string
): Promise<ActionResult<ProxyStatus>> {
  try {
    const data = await api<ProxyStatus>(`/servers/${id}/proxy`, {
      token: await requireToken(),
    })
    return { ok: true, data }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof ApiError
          ? err.message
          : (await getTranslations("infra.errors"))("serverUnreachable"),
    }
  }
}

export async function removeServerProxyAction(
  id: string
): Promise<ActionResult> {
  try {
    await api<void>(`/servers/${id}/proxy`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath("/settings")
    return { ok: true, data: undefined }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof ApiError
          ? err.message
          : (await getTranslations("infra.errors"))("serverUnreachable"),
    }
  }
}

