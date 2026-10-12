"use server"

import { getTranslations } from "next-intl/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import type { Domain } from "@/features/application/application.entity"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type {
  CertMode,
  DnsConnection,
  DnsConnectionTestResult,
  ProxyDnsState,
} from "./dns.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

async function fail(err: unknown): Promise<{ ok: false; error: string }> {
  const t = await getTranslations("dns")
  return {
    ok: false,
    error: err instanceof ApiError ? err.message : t("errors.unreachable"),
  }
}

type Field = "name" | "apiToken" | "accountId"

export interface DnsConnectionFormState {
  error?: string
  fieldErrors?: Partial<Record<Field, string[]>>
  values?: Record<"name" | "accountId", string>
  created?: boolean
}

export async function createDnsConnectionAction(
  _prev: DnsConnectionFormState,
  formData: FormData
): Promise<DnsConnectionFormState> {
  const t = await getTranslations("dns")
  const values = {
    name: String(formData.get("name") ?? ""),
    accountId: String(formData.get("accountId") ?? ""),
  }
  const parsed = z
    .object({
      name: z.string().trim().min(1, t("validation.nameRequired")).max(100),
      apiToken: z
        .string()
        .trim()
        .min(10, t("validation.tokenRequired"))
        .max(512)
        .regex(/^[A-Za-z0-9_-]+$/, t("validation.tokenChars")),
      accountId: z
        .string()
        .trim()
        .refine(
          (v) => v === "" || /^[a-f0-9]{32}$/i.test(v),
          t("validation.accountId")
        ),
    })
    .safeParse({ ...values, apiToken: formData.get("apiToken") ?? "" })
  if (!parsed.success) {
    const fieldErrors: DnsConnectionFormState["fieldErrors"] = {}
    for (const issue of parsed.error.issues) {
      ;(fieldErrors[issue.path[0] as Field] ??= []).push(issue.message)
    }
    return { fieldErrors, values }
  }
  const { accountId, ...rest } = parsed.data
  try {
    await api<DnsConnection>("/dns-connections", {
      method: "POST",
      body: accountId ? { ...rest, accountId } : rest,
      token: await requireToken(),
    })
  } catch (err) {
    return { error: (await fail(err)).error, values }
  }
  revalidatePath("/integrations/dns")
  return { created: true }
}

export async function deleteDnsConnectionAction(
  id: string
): Promise<ActionResult> {
  try {
    await api<void>(`/dns-connections/${id}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath("/integrations/dns")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

export async function testDnsConnectionAction(
  id: string
): Promise<ActionResult<DnsConnectionTestResult>> {
  try {
    const data = await api<DnsConnectionTestResult>(
      `/dns-connections/${id}/test`,
      { method: "POST", token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

/** Binds a DNS connection to a proxy (DNS-01); a running proxy is recreated when `acceptProxyRestart`. */
export async function setProxyDnsAction(input: {
  connectionId: string
  serverId: string | null
  acceptProxyRestart: boolean
}): Promise<ActionResult<ProxyDnsState>> {
  try {
    const data = await api<ProxyDnsState>("/proxy/dns", {
      method: "PUT",
      body: {
        connectionId: input.connectionId,
        acceptProxyRestart: input.acceptProxyRestart,
        ...(input.serverId ? { serverId: input.serverId } : {}),
      },
      token: await requireToken(),
    })
    revalidatePath("/infra/proxy")
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function clearProxyDnsAction(input: {
  serverId: string | null
  acceptProxyRestart: boolean
}): Promise<ActionResult<ProxyDnsState>> {
  try {
    const q = new URLSearchParams()
    if (input.serverId) q.set("serverId", input.serverId)
    if (input.acceptProxyRestart) q.set("acceptProxyRestart", "true")
    const data = await api<ProxyDnsState>(`/proxy/dns?${q.toString()}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath("/infra/proxy")
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export interface DomainDnsPatch {
  certMode?: CertMode
  /** null detaches (records created by aoox are deleted). */
  dnsConnectionId?: string | null
  dnsProxied?: boolean
  dnsOverwrite?: boolean
}

export async function updateDomainDnsAction(
  applicationId: string,
  domainId: string,
  patch: DomainDnsPatch
): Promise<ActionResult<Domain>> {
  try {
    const data = await api<Domain>(
      `/applications/${applicationId}/domains/${domainId}`,
      { method: "PATCH", body: patch, token: await requireToken() }
    )
    revalidatePath(`/applications/${applicationId}`)
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function syncDomainDnsAction(
  applicationId: string,
  domainId: string,
  overwrite: boolean
): Promise<ActionResult<Domain>> {
  try {
    const data = await api<Domain>(
      `/applications/${applicationId}/domains/${domainId}/dns/sync`,
      { method: "POST", body: { overwrite }, token: await requireToken() }
    )
    revalidatePath(`/applications/${applicationId}`)
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function setPreviewWildcardAction(
  applicationId: string,
  enabled: boolean
): Promise<ActionResult> {
  try {
    await api(`/applications/${applicationId}`, {
      method: "PATCH",
      body: { previewWildcardCert: enabled },
      token: await requireToken(),
    })
    revalidatePath(`/applications/${applicationId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}
