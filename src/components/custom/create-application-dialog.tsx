"use client"

import { Plus } from "lucide-react"
import { useState } from "react"
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
import { createApplicationAction } from "@/features/application/application.actions"
import type { GitCredential } from "@/features/git-credential/git-credential.entity"
import type { Registry } from "@/features/registry/registry.entity"
import type { Server } from "@/features/server/server.entity"

export function CreateApplicationDialog({
  projectId,
  credentials,
  servers,
  registries = [],
}: {
  projectId: string
  credentials: GitCredential[]
  servers: Server[]
  registries?: Registry[]
}) {
  const [open, setOpen] = useState(false)
  const action = createApplicationAction.bind(null, projectId)

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
          submitLabel="Buat aplikasi"
          credentials={credentials}
          servers={servers}
          registries={registries}
        />
      </DialogContent>
    </Dialog>
  )
}
