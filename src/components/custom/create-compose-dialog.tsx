"use client"

import { Plus } from "lucide-react"
import { useState } from "react"
import { ComposeForm } from "@/components/custom/compose-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createComposeAppAction } from "@/features/compose/compose.actions"
import type { GitCredential } from "@/features/git-credential/git-credential.entity"

export function CreateComposeDialog({
  projectId,
  credentials,
  databaseSlugs,
}: {
  projectId: string
  credentials: GitCredential[]
  databaseSlugs: string[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus data-icon="inline-start" />
          Stack compose
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Stack compose baru</DialogTitle>
          <DialogDescription>
            Deploy <code>docker-compose.yml</code> dari repo git; layanan di
            dalamnya di-build dan dijalankan apa adanya.
          </DialogDescription>
        </DialogHeader>
        <ComposeForm
          action={createComposeAppAction.bind(null, projectId)}
          submitLabel="Buat stack"
          credentials={credentials}
          databaseSlugs={databaseSlugs}
        />
      </DialogContent>
    </Dialog>
  )
}
