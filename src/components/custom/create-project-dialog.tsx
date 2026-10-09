"use client"

import { Plus } from "lucide-react"
import { useTranslations } from "next-intl"
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
  const t = useTranslations("projects")
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus data-icon="inline-start" />
          {t("create.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("create.title")}</DialogTitle>
          <DialogDescription>
            {t("create.description")}
          </DialogDescription>
        </DialogHeader>
        <ProjectForm action={createProjectAction} submitLabel={t("create.submit")} />
      </DialogContent>
    </Dialog>
  )
}
