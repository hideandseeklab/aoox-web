"use client"

import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { ApplicationForm } from "@/components/custom/application-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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

export function CreateApplicationDialog({
  projectId,
  credentials,
  servers,
  registries = [],
  proxy,
}: {
  projectId: string
  credentials: GitCredential[]
  servers: Server[]
  registries?: Registry[]
  proxy: ProxyStatus
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const action = createApplicationAction.bind(null, projectId)

  // "Domain" access option: `createApplicationAction` redirects on success,
  // which would abort before we get a chance to call `addDomainAction` — so
  // this path creates the app without redirecting, adds the domain, then
  // navigates itself.
  const createWithDomain = async (
    formData: FormData
  ): Promise<ActionResult> => {
    const created = await createApplicationForAccessAction(
      projectId,
      formData
    )
    if (!created.ok) return created
    const app = created.data
    const host = String(formData.get("domainHost") ?? "").trim()
    let proxyAutoProvisioned = false
    if (host) {
      const https = formData.get("domainHttps") === "on"
      const domain = await addDomainAction(app.id, host, https)
      if (!domain.ok) {
        toast.error(
          `Aplikasi dibuat, tapi domain gagal ditambahkan: ${domain.error}`
        )
      } else {
        proxyAutoProvisioned = !!domain.data.proxyAutoProvisioned
        toast.success("Aplikasi & domain dibuat.")
      }
    }
    setOpen(false)
    router.push(
      `/applications/${app.id}${proxyAutoProvisioned ? "?domainProxyAutoProvisioned=1" : ""}`
    )
    return { ok: true, data: undefined }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus data-icon="inline-start" />
          New application
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Aplikasi baru</DialogTitle>
          <DialogDescription>
            Di-build dari repo git (Dockerfile, Nixpacks, atau situs statis)
            atau di-pull dari image siap pakai, lalu dijalankan sebagai
            container.
          </DialogDescription>
        </DialogHeader>
        <ApplicationForm
          action={action}
          mode="create"
          submitLabel="Buat aplikasi"
          credentials={credentials}
          servers={servers}
          registries={registries}
          proxy={proxy}
          onCreateWithDomain={createWithDomain}
        />
      </DialogContent>
    </Dialog>
  )
}
