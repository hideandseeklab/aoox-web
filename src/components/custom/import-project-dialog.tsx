"use client"

import { Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
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
      let parsed: unknown
      try {
        parsed = JSON.parse(await file.text())
      } catch {
        setError("File bukan JSON yang valid")
        return
      }
      const r = await importProjectAction(parsed, name)
      if (!r.ok) {
        setError(r.error)
        return
      }
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
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload data-icon="inline-start" />
          Impor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Impor project</DialogTitle>
          <DialogDescription>
            Buat project baru dari file ekspor (<code>*.aoox.json</code>).
            Tidak ada yang di-deploy; database dibuat kosong, aplikasi menunggu
            deploy pertama.
          </DialogDescription>
        </DialogHeader>
        {report ? (
          <div className="space-y-3 text-sm">
            <p>
              Dibuat: {report.created.applications} aplikasi,{" "}
              {report.created.databases} database, {report.created.composeApps}{" "}
              compose, {report.created.domains} domain, {report.created.mounts}{" "}
              mount, {report.created.jobs} job.
            </p>
            <Alert>
              <AlertTitle>Perlu diperiksa</AlertTitle>
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
                Buka project
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
              <Label htmlFor="import-file">File ekspor</Label>
              <Input
                id="import-file"
                type="file"
                accept=".json,application/json"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="import-name">Nama project (opsional)</Label>
              <Input
                id="import-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pakai nama dari file"
                maxLength={100}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={pending || !file}>
                {pending ? "Mengimpor…" : "Impor"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
