"use client"

import { Plus } from "lucide-react"
import { useState } from "react"
import { ProjectForm } from "@/components/custom/project-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createProjectAction } from "@/features/project/project.actions"

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus data-icon="inline-start" />
          New project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Project baru</DialogTitle>
          <DialogDescription>
            Project mengelompokkan aplikasi dan database yang di-deploy.
          </DialogDescription>
        </DialogHeader>
        <ProjectForm action={createProjectAction} submitLabel="Buat project" />
      </DialogContent>
    </Dialog>
  )
}
