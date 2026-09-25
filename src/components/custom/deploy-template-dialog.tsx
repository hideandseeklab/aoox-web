"use client"

import { Rocket } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { Project } from "@/features/project/project.entity"
import type { ProxyStatus } from "@/features/proxy/proxy.entity"
import { deployTemplateAction } from "@/features/template/template.actions"
import type { Template } from "@/features/template/template.entity"
import { useBrowserHost } from "./use-browser-host"

/**
 * One-click deploy: pick a project, optionally a hostname per exposed
 * service (routed by the platform proxy) and fill the template's variables.
 * Secrets left empty are generated on the API.
 */
export function DeployTemplateDialog({
  template,
  projects,
  proxy,
  defaultProjectId,
  onClose,
}: {
  template: Template | null
  projects: Project[]
  proxy: ProxyStatus
  defaultProjectId?: string
  onClose: () => void
}) {
  const router = useRouter()
  const browserHost = useBrowserHost()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [projectId, setProjectId] = useState(
    defaultProjectId ?? projects[0]?.id ?? ""
  )
  const [name, setName] = useState("")
  const [hosts, setHosts] = useState<Record<string, string>>({})
  const [https, setHttps] = useState<Record<string, boolean>>({})
  const [hostPorts, setHostPorts] = useState<Record<string, string>>({})
  const [values, setValues] = useState<Record<string, string>>({})

  const key = (s: { service: string; port: number }) => `${s.service}:${s.port}`

  const submit = () =>
    start(async () => {
      if (!template) return
      setError(null)
      const serviceDomains = template.services
        .filter((s) => hosts[key(s)]?.trim())
        .map((s) => ({
          service: s.service,
          port: s.port,
          host: hosts[key(s)].trim().toLowerCase(),
          https: !!https[key(s)],
        }))
      const servicePorts = template.services
        .filter((s) => Number(hostPorts[key(s)]) > 0)
        .map((s) => ({
          service: s.service,
          port: s.port,
          hostPort: Number(hostPorts[key(s)]),
        }))
      const r = await deployTemplateAction({
        projectId,
        templateId: template.id,
        name: name.trim() || undefined,
        variables: values,
        serviceDomains,
        servicePorts,
      })
      if (!r.ok) setError(r.error)
      else {
        onClose()
        router.push(`/compose/${r.id}`)
      }
    })

  return (
    <Dialog open={template !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {template && (
          <>
            <DialogHeader>
              <DialogTitle>Deploy {template.name}</DialogTitle>
              <DialogDescription>
                {template.description} Stack dibuat sebagai compose app di
                project yang dipilih dan langsung di-deploy.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="tpl-project">Project</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger id="tpl-project">
                      <SelectValue placeholder="Pilih project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tpl-name">Nama</Label>
                  <Input
                    id="tpl-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={template.name}
                  />
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Akses</legend>
                <p className="text-xs text-muted-foreground">
                  Opsional, bisa diatur nanti di Pengaturan. Domain dibuka lewat
                  proxy (arahkan DNS ke server ini); port host dibuka lewat IP,
                  mis. <code>http://{browserHost ?? "<ip-server>"}:8080</code>.
                  {!proxy.running &&
                    " Proxy belum berjalan (Infrastruktur → Reverse proxy); domain baru aktif setelah di-provision."}
                </p>
                {template.services.map((s) => (
                  <div key={key(s)} className="flex items-end gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label htmlFor={`tpl-host-${key(s)}`}>
                        {s.label}{" "}
                        <span className="font-mono text-xs text-muted-foreground">
                          {s.service}:{s.port}
                        </span>
                      </Label>
                      <Input
                        id={`tpl-host-${key(s)}`}
                        value={hosts[key(s)] ?? ""}
                        onChange={(e) =>
                          setHosts((h) => ({ ...h, [key(s)]: e.target.value }))
                        }
                        placeholder={`${template.id}.example.com`}
                      />
                    </div>
                    <label className="mb-2 flex items-center gap-2 text-sm">
                      <Switch
                        checked={!!https[key(s)]}
                        disabled={!proxy.acmeEmail}
                        onCheckedChange={(c) =>
                          setHttps((h) => ({ ...h, [key(s)]: c }))
                        }
                      />
                      HTTPS
                    </label>
                    <div className="space-y-1">
                      <Label htmlFor={`tpl-port-${key(s)}`}>Port host</Label>
                      <Input
                        id={`tpl-port-${key(s)}`}
                        type="number"
                        min={1}
                        max={65535}
                        value={hostPorts[key(s)] ?? ""}
                        onChange={(e) =>
                          setHostPorts((h) => ({
                            ...h,
                            [key(s)]: e.target.value,
                          }))
                        }
                        placeholder="8080"
                        className="w-24"
                      />
                    </div>
                  </div>
                ))}
              </fieldset>

              {template.variables.length > 0 && (
                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium">Konfigurasi</legend>
                  {template.variables.map((v) => (
                    <div key={v.key} className="space-y-1">
                      <Label htmlFor={`tpl-var-${v.key}`}>
                        {v.label}{" "}
                        <span className="font-mono text-xs text-muted-foreground">
                          {v.key}
                        </span>
                      </Label>
                      <Input
                        id={`tpl-var-${v.key}`}
                        value={values[v.key] ?? ""}
                        onChange={(e) =>
                          setValues((x) => ({ ...x, [v.key]: e.target.value }))
                        }
                        placeholder={
                          v.generate
                            ? "(dibuat otomatis kalau kosong)"
                            : (v.default ?? "")
                        }
                        required={v.required}
                      />
                      {v.hint && (
                        <p className="text-xs text-muted-foreground">
                          {v.hint}
                        </p>
                      )}
                    </div>
                  ))}
                </fieldset>
              )}

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={pending}>
                Batal
              </Button>
              <Button onClick={submit} disabled={pending || !projectId}>
                <Rocket data-icon="inline-start" />
                {pending ? "Membuat…" : "Deploy"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
