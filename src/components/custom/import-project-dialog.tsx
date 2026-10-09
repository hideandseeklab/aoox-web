"use client"

import { Loader2, Upload } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/lib/use-router"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { importProjectAction } from "@/features/project-transfer/project-transfer.actions"
import type { ImportReport } from "@/features/project-transfer/project-transfer.entity"

/**
 * Creates a project from an export file. The file is parsed in the browser
 * and sent as JSON; the report (counts + warnings about renamed slugs or
 * unresolved references) is shown before navigating to the new project so
 * warnings are not lost.
 */
export function ImportProjectDialog() {
  const t = useTranslations("projects")
  const tc = useTranslations("common")
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [pending, start] = useTransition()

  const reset = () => {
    setFile(null)
    setName("")
    setError(null)
    setReport(null)
  }

  const submit = () => {
    if (!file) return
    start(async () => {
      setError(null)
      const toastId = toast.loading(
        t("import.importing", { name: name.trim() || file.name })
      )
      let parsed: unknown
      try {
        parsed = JSON.parse(await file.text())
      } catch {
        setError(t("import.invalidJson"))
        toast.error(t("import.invalidJson"), { id: toastId })
        return
      }
      const r = await importProjectAction(parsed, name)
      if (!r.ok) {
        setError(r.error)
        toast.error(r.error, { id: toastId })
        return
      }
      toast.success(
        r.data.warnings.length === 0
          ? t("import.imported")
          : t("import.importedWithWarnings", { count: r.data.warnings.length }),
        { id: toastId }
      )
      if (r.data.warnings.length === 0) {
        setOpen(false)
        router.push(`/projects/${r.data.projectId}`)
        return
      }
      setReport(r.data)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (pending) return
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload data-icon="inline-start" />
          {tc("actions.import")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>{t("import.title")}</DialogTitle>
          <DialogDescription>
            {t.rich("import.description", {
              code: (chunks) => <code>{chunks}</code>,
            })}
          </DialogDescription>
        </DialogHeader>
        {report ? (
          <div className="space-y-3 text-xs">
            <p>
              {t("import.created", {
                applications: report.created.applications,
                databases: report.created.databases,
                composeApps: report.created.composeApps,
                domains: report.created.domains,
                mounts: report.created.mounts,
                jobs: report.created.jobs,
              })}
            </p>
            <Alert>
              <AlertTitle>{t("import.needsReview")}</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 ps-4">
                  {report.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button
                onClick={() => {
                  setOpen(false)
                  router.push(`/projects/${report.projectId}`)
                }}
              >
                {t("import.openProject")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="import-file">{t("import.file")}</Label>
              <Input
                id="import-file"
                type="file"
                accept=".json,application/json"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="import-name">{t("import.name")}</Label>
              <Input
                id="import-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("import.namePlaceholder")}
                maxLength={100}
              />
            </div>
            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={pending || !file}>
                {pending && (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                )}
                {pending ? t("import.submitting") : tc("actions.import")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
