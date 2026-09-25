"use server"

import { revalidatePath } from "next/cache"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { ImportReport } from "./project-transfer.entity"

export type ImportProjectResult =
  { ok: true; data: ImportReport } | { ok: false; error: string }

/** `file` is the parsed content of an export file; `name` overrides the project name. */
export async function importProjectAction(
  file: unknown,
  name?: string
): Promise<ImportProjectResult> {
  try {
    const data = await api<ImportReport>("/projects/import", {
      method: "POST",
      body: { file, ...(name?.trim() ? { name: name.trim() } : {}) },
      token: await requireToken(),
    })
    revalidatePath("/projects")
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
