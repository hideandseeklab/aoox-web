"use server"

import { getTranslations } from "next-intl/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { Certificate } from "./certificate.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

async function fail(err: unknown): Promise<{ ok: false; error: string }> {
  const t = await getTranslations("settings")
  return {
    ok: false,
    error: err instanceof ApiError ? err.message : t("errors.unreachable"),
  }
}

// PEM text is small; the cap only stops absurd pastes.
const pem = z.string().trim().min(1).max(100_000)

const createSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().trim().min(1, t("validation.nameRequired")).max(100),
    certificate: pem,
    privateKey: pem,
  })

const replaceSchema = z.object({ certificate: pem, privateKey: pem })

export interface CertificateInput {
  name?: string
  certificate: string
  privateKey: string
}

/** The private key only travels in this request body; it is never returned, stored in state or logged. */
export async function createCertificateAction(
  input: Required<CertificateInput>
): Promise<ActionResult<Certificate>> {
  const t = await getTranslations("settings")
  const parsed = createSchema(t).safeParse(input)
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? t("errors.invalid"),
    }
  try {
    const data = await api<Certificate>("/certificates", {
      method: "POST",
      body: parsed.data,
      token: await requireToken(),
    })
    revalidatePath("/integrations/certificates")
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

/** Replaces the content of an existing certificate (the name stays). */
export async function replaceCertificateAction(
  id: string,
  input: Omit<CertificateInput, "name">
): Promise<ActionResult<Certificate>> {
  const parsed = replaceSchema.safeParse(input)
  if (!parsed.success) {
    const t = await getTranslations("settings")
    return { ok: false, error: t("validation.certAndKeyRequired") }
  }
  try {
    const data = await api<Certificate>(`/certificates/${id}`, {
      method: "PUT",
      body: parsed.data,
      token: await requireToken(),
    })
    revalidatePath("/integrations/certificates")
    revalidatePath("/applications/[id]", "page")
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteCertificateAction(
  id: string
): Promise<ActionResult> {
  try {
    await api<void>(`/certificates/${id}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath("/integrations/certificates")
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}
