"use client"

import { PathArrow } from "@/components/custom/arrows"
import { Loader2, Rocket } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/lib/use-router"
import { useState, useTransition } from "react"
import { toast } from "sonner"
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
  const t = useTranslations("templates.dialog")
  const tNav = useTranslations("nav")
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
      const stackName = name.trim() || template.name
      const toastId = toast.loading(t("creating", { name: stackName }))
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
      if (!r.ok) {
        setError(r.error)
        toast.error(r.error, { id: toastId })
      } else {
        toast.success(t("created", { name: stackName }), { id: toastId })
        onClose()
        router.push(`/compose/${r.id}`)
      }
    })

  return (
    <Dialog
      open={template !== null}
      onOpenChange={(o) => !pending && !o && onClose()}
    >
      <DialogContent
        className="max-h-[90svh] overflow-y-auto sm:max-w-lg"
        showCloseButton={!pending}
      >
        {template && (
          <>
            <DialogHeader>
              <DialogTitle>{t("title", { name: template.name })}</DialogTitle>
              <DialogDescription>
                {template.description} {t("description")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="tpl-project">Project</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger id="tpl-project">
                      <SelectValue placeholder={t("projectPlaceholder")} />
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
                  <Label htmlFor="tpl-name">{t("name")}</Label>
                  <Input
                    id="tpl-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={template.name}
                  />
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t("access.title")}</legend>
                <p className="text-xs text-muted-foreground">
                  {t.rich("access.description", {
                    example: `http://${browserHost ?? `<${t("access.serverIp")}>`}:8080`,
                    code: (c) => <code>{c}</code>,
                  })}
                  {!proxy.running && (
                    <>
                      {" "}
                      {t.rich("access.proxyStopped", {
                        path: () => (
                          <>
                            {tNav("groups.infrastructure")}
                            <PathArrow />
                            {tNav("reverseProxy")}
                          </>
                        ),
                      })}
                    </>
                  )}
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
                    <label className="mb-2 flex items-center gap-2 text-xs">
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
                      <Label htmlFor={`tpl-port-${key(s)}`}>{t("access.hostPort")}</Label>
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
                  <legend className="text-sm font-medium">{t("configuration")}</legend>
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
                            ? t("autoGenerated")
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
                <p className="text-xs text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={pending}>
                {t("cancel")}
              </Button>
              <Button onClick={submit} disabled={pending || !projectId}>
                {pending ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Rocket data-icon="inline-start" />
                )}
                {pending ? t("submitting") : t("submit")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
