"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type {
  BackupDestination,
  BackupDestinationTestResult,
} from "./backup-destination.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

const schema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100),
  endpoint: z
    .string()
    .trim()
    .max(255)
    .refine((v) => !v || /^https?:\/\/\S+$/.test(v), "Harus URL http(s)://"),
  region: z.string().trim().max(64),
  bucket: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/, "Nama bucket tidak valid"),
  prefix: z.string().trim().max(255).regex(/^\S*$/, "Tanpa spasi"),
  accessKeyId: z.string().trim().min(1, "Access key wajib diisi").max(255),
  secretAccessKey: z.string().min(1, "Secret key wajib diisi").max(1024),
  forcePathStyle: z.boolean(),
})

type Field =
  | "name"
  | "endpoint"
  | "region"
  | "bucket"
  | "prefix"
  | "accessKeyId"
  | "secretAccessKey"

export interface BackupDestinationFormState {
  error?: string
  fieldErrors?: Partial<Record<Field, string[]>>
  values?: Partial<Record<Exclude<Field, "secretAccessKey">, string>>
  created?: boolean
}

export async function createBackupDestinationAction(
  _prev: BackupDestinationFormState,
  formData: FormData
): Promise<BackupDestinationFormState> {
  const str = (k: string) => String(formData.get(k) ?? "")
  const values = {
    name: str("name"),
    endpoint: str("endpoint"),
    region: str("region"),
    bucket: str("bucket"),
    prefix: str("prefix"),
    accessKeyId: str("accessKeyId"),
  }
  const parsed = schema.safeParse({
    ...values,
    secretAccessKey: str("secretAccessKey"),
    forcePathStyle: formData.get("forcePathStyle") === "on",
  })
  if (!parsed.success) {
    const fieldErrors: BackupDestinationFormState["fieldErrors"] = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as Field
      ;(fieldErrors[key] ??= []).push(issue.message)
    }
    return { fieldErrors, values }
  }
  try {
    await api<BackupDestination>("/backup-destinations", {
      method: "POST",
      body: {
        ...parsed.data,
        endpoint: parsed.data.endpoint || null,
      },
      token: await requireToken(),
    })
  } catch (err) {
    return {
      error:
        err instanceof ApiError
          ? err.message
          : "Tidak dapat terhubung ke server",
      values,
    }
  }
  revalidatePath("/settings")
  return { created: true }
}

export async function deleteBackupDestinationAction(
  id: string
): Promise<ActionResult> {
  try {
    await api<void>(`/backup-destinations/${id}`, {
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
          : "Tidak dapat terhubung ke server",
    }
  }
}

export async function testBackupDestinationAction(
  id: string
): Promise<ActionResult<BackupDestinationTestResult>> {
  try {
    const data = await api<BackupDestinationTestResult>(
      `/backup-destinations/${id}/test`,
      { method: "POST", token: await requireToken() }
    )
    return { ok: true, data }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof ApiError
          ? err.message
          : "Tidak dapat terhubung ke server",
    }
  }
}
