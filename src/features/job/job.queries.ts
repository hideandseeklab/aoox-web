import { requireToken } from "@/features/auth/auth.session"
import { api } from "@/lib/api"
import { ownerBase, type Job, type JobOwner } from "./job.entity"

export async function listJobs(owner: JobOwner): Promise<Job[]> {
  return api<Job[]>(`${ownerBase(owner)}/jobs`, {
    token: await requireToken(),
  })
}
