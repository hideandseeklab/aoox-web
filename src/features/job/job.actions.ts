"use server"

import { revalidatePath } from "next/cache"
import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import {
  ownerBase,
  ownerPage,
  type Job,
  type JobOwner,
  type JobRun,
  type JobTarget,
} from "./job.entity"

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

function fail(err: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error:
      err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server",
  }
}

export interface JobInput {
  name: string
  cron: string | null
  command: string
  target: JobTarget
  enabled: boolean
  timeoutSeconds: number
  /** Compose only. */
  service?: string
}

export async function createJobAction(
  owner: JobOwner,
  input: JobInput
): Promise<ActionResult<Job>> {
  try {
    const data = await api<Job>(`${ownerBase(owner)}/jobs`, {
      method: "POST",
      body: input,
      token: await requireToken(),
    })
    revalidatePath(ownerPage(owner))
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function updateJobAction(
  owner: JobOwner,
  jobId: string,
  input: Partial<JobInput>
): Promise<ActionResult<Job>> {
  try {
    const data = await api<Job>(`/jobs/${jobId}`, {
      method: "PATCH",
      body: input,
      token: await requireToken(),
    })
    revalidatePath(ownerPage(owner))
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteJobAction(
  owner: JobOwner,
  jobId: string
): Promise<ActionResult> {
  try {
    await api<void>(`/jobs/${jobId}`, {
      method: "DELETE",
      token: await requireToken(),
    })
    revalidatePath(ownerPage(owner))
    return { ok: true, data: undefined }
  } catch (err) {
    return fail(err)
  }
}

/** 202: the run is created and executes detached; poll the runs list. */
export async function runJobAction(
  jobId: string
): Promise<ActionResult<JobRun>> {
  try {
    const data = await api<JobRun>(`/jobs/${jobId}/run`, {
      method: "POST",
      token: await requireToken(),
    })
    return { ok: true, data }
  } catch (err) {
    return fail(err)
  }
}

export async function fetchJobRunsAction(
  jobId: string
): Promise<JobRun[] | null> {
  try {
    return await api<JobRun[]>(`/jobs/${jobId}/runs`, {
      token: await requireToken(),
    })
  } catch {
    return null
  }
}
