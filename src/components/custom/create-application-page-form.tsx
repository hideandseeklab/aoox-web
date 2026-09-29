"use client"

import { useRouter } from "@/lib/use-router"
import { toast } from "sonner"
import { ApplicationForm } from "@/components/custom/application-form"
import {
  addDomainAction,
  createApplicationAction,
  createApplicationForAccessAction,
  type ActionResult,
} from "@/features/application/application.actions"
import type { GitCredential } from "@/features/git-credential/git-credential.entity"
import type { ProxyStatus } from "@/features/proxy/proxy.entity"
import type { Registry } from "@/features/registry/registry.entity"
import type { Server } from "@/features/server/server.entity"

/**
 * Standalone "Aplikasi baru" page's form — same "Domain" access glue the
 * dialog version used to have (the plain create action redirects, which
 * would abort before the add-domain call), just without a dialog to close.
 */
export function CreateApplicationPageForm({
  projectId,
  credentials,
  servers,
  registries,
  proxy,
}: {
  projectId: string
  credentials: GitCredential[]
  servers: Server[]
  registries: Registry[]
  proxy: ProxyStatus
}) {
  const router = useRouter()
  const action = createApplicationAction.bind(null, projectId)

  const createWithDomain = async (
    formData: FormData,
    toastId: string | number
  ): Promise<ActionResult> => {
    const created = await createApplicationForAccessAction(
      projectId,
      formData
    )
    if (!created.ok) {
      toast.error(created.error, { id: toastId })
      return created
    }
    const app = created.data
    const host = String(formData.get("domainHost") ?? "").trim()
    let proxyAutoProvisioned = false
    if (host) {
      const https = formData.get("domainHttps") === "on"
      const domain = await addDomainAction(app.id, host, https)
      if (!domain.ok) {
        toast.error(
          `Aplikasi dibuat, tapi domain gagal ditambahkan: ${domain.error}`,
          { id: toastId }
        )
      } else {
        proxyAutoProvisioned = !!domain.data.proxyAutoProvisioned
        toast.success(`Aplikasi "${app.name}" & domain dibuat.`, {
          id: toastId,
        })
      }
    } else {
      toast.success(`Aplikasi "${app.name}" dibuat.`, { id: toastId })
    }
    router.push(
      `/applications/${app.id}${proxyAutoProvisioned ? "?domainProxyAutoProvisioned=1" : ""}`
    )
    return { ok: true, data: undefined }
  }

  return (
    <ApplicationForm
      action={action}
      mode="create"
      submitLabel="Buat aplikasi"
      credentials={credentials}
      servers={servers}
      registries={registries}
      proxy={proxy}
      onCreateWithDomain={createWithDomain}
      cancelHref={`/projects/${projectId}`}
    />
  )
}
