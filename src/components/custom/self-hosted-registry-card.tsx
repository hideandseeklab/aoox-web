"use client"

import { Copy, Info, Play, Trash2, Trash } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import type { BackupDestination } from "@/features/backup-destination/backup-destination.entity"
import {
  garbageCollectAction,
  provisionSelfHostedAction,
  removeSelfHostedAction,
  setRegistryDomainAction,
} from "@/features/registry/registry.actions"
import type {
  ProvisionResult,
  SelfHostedStatus,
} from "@/features/registry/registry.entity"
import { copyToClipboard } from "@/lib/clipboard"

export function SelfHostedRegistryCard({
  status,
  canManage,
  destinations,
}: {
  status: SelfHostedStatus
  canManage: boolean
  destinations: BackupDestination[]
}) {
  const t = useTranslations("registry.selfHosted")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [creds, setCreds] = useState<ProvisionResult | null>(null)
  const [gcOutput, setGcOutput] = useState<string | null>(null)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [domainInput, setDomainInput] = useState("")
  const [provisionOpen, setProvisionOpen] = useState(false)
  const [destinationId, setDestinationId] = useState("local")

  const { container, registry, dockerAvailable, publicUrl } = status
  const installed = container.installed && registry !== null
  const storageName = registry?.storageDestinationId
    ? (destinations.find((d) => d.id === registry.storageDestinationId)?.name ??
      "S3")
    : t("storageLocal")

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? t("failed"))
    })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>
              {t.rich("description", {
                code: (c) => <code>{c}</code>,
                addr: (c) => <code className="text-foreground">{c}</code>,
                url: registry?.url ?? publicUrl,
              })}
            </CardDescription>
          </div>
          <StatusBadge status={status} t={t} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!dockerAvailable && (
          <Alert>
            <AlertTitle>{t("dockerUnavailable.title")}</AlertTitle>
            <AlertDescription>
              {t.rich("dockerUnavailable.description", {
                code: (c) => <code>{c}</code>,
              })}
            </AlertDescription>
          </Alert>
        )}
        {installed && registry && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
            <dt className="text-muted-foreground">{t("username")}</dt>
            <dd className="font-mono">{registry.username}</dd>
            <dt className="text-muted-foreground">{t("container")}</dt>
            <dd className="font-mono">
              {container.containerId?.slice(0, 12)} · {container.state}
            </dd>
            <dt className="text-muted-foreground">{t("login")}</dt>
            <dd className="font-mono">
              docker login {registry.url} -u {registry.username}
            </dd>
            <dt className="text-muted-foreground">{t("storage")}</dt>
            <dd>{storageName}</dd>
            {registry.domain && (
              <>
                <dt className="text-muted-foreground">{t("domain")}</dt>
                <dd className="font-mono text-primary">{registry.domain}</dd>
              </>
            )}
          </dl>
        )}
        {installed && canManage && (
          <form
            className="flex flex-wrap items-end gap-2 border-t pt-3"
            onSubmit={(e) => {
              e.preventDefault()
              const domain = domainInput.trim()
              if (!domain || !registry) return
              start(async () => {
                setError(null)
                const r = await setRegistryDomainAction(registry.id, domain)
                if (r.ok) setDomainInput("")
                else setError(r.error)
              })
            }}
          >
            <div className="min-w-0 flex-1 space-y-1">
              <Label htmlFor="registry-domain">{t("customDomain")}</Label>
              <Input
                id="registry-domain"
                placeholder="registry.example.com"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                disabled={pending}
              />
            </div>
            <Button type="submit" disabled={pending || !domainInput.trim()}>
              {t("apply")}
            </Button>
            {registry?.domain && (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  run(() => setRegistryDomainAction(registry.id, null))
                }
              >
                {t("removeDomain")}
              </Button>
            )}
            <p className="w-full text-xs text-muted-foreground">
              {t.rich("domainNote", { code: (c) => <code>{c}</code> })}
            </p>
          </form>
        )}
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        {gcOutput !== null && (
          <pre className="max-h-48 overflow-auto rounded-md border bg-muted p-2 text-xs">
            {gcOutput || t("noOutput")}
          </pre>
        )}
      </CardContent>
      {canManage && (
        <CardFooter className="flex flex-wrap gap-2">
          {!installed ? (
            <Button
              disabled={pending || !dockerAvailable}
              onClick={() => setProvisionOpen(true)}
            >
              <Play data-icon="inline-start" />
              {t("enable")}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    const r = await garbageCollectAction(true)
                    if (r.ok) setGcOutput(r.data.output)
                    return r
                  })
                }
              >
                {t("gcDryRun")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    const r = await garbageCollectAction(false)
                    if (r.ok) setGcOutput(r.data.output)
                    return r
                  })
                }
              >
                <Trash data-icon="inline-start" />
                {t("gc")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={() => setRemoveOpen(true)}
              >
                <Trash2 data-icon="inline-start" />
                {t("remove")}
              </Button>
            </>
          )}
        </CardFooter>
      )}

      <Dialog open={provisionOpen} onOpenChange={setProvisionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("provision.title")}</DialogTitle>
            <DialogDescription>{t("provision.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="registry-storage">{t("storage")}</Label>
            <Select value={destinationId} onValueChange={setDestinationId}>
              <SelectTrigger id="registry-storage" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="local">
                  {t("provision.localDisk")}
                </SelectItem>
                {destinations.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {t("provision.s3Option", { name: d.name })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {destinations.length === 0 && (
            <Alert>
              <Info />
              <AlertDescription>
                {t("provision.noDestinations")}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProvisionOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const r = await provisionSelfHostedAction(
                    destinationId === "local" ? undefined : destinationId
                  )
                  if (r.ok) {
                    setCreds(r.data)
                    setProvisionOpen(false)
                  }

                  return r
                })
              }
            >
              {pending ? t("provision.preparing") : t("provision.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creds !== null} onOpenChange={(o) => !o && setCreds(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("ready.title")}</DialogTitle>
            <DialogDescription>{t("ready.description")}</DialogDescription>
          </DialogHeader>
          {creds && (
            <div className="space-y-2 text-xs">
              <CredRow label={t("ready.address")} value={creds.registry.url} />
              <CredRow label={t("username")} value={creds.username} />
              <CredRow label={t("ready.password")} value={creds.password} />
              <CredRow
                label={t("login")}
                value={`docker login ${creds.registry.url} -u ${creds.username}`}
              />
            </div>
          )}
          {creds?.registry.url.startsWith("localhost:") && (
            <Alert>
              <Info />
              <AlertDescription>
                {t.rich("ready.localhostNote", {
                  code: (c) => <code>{c}</code>,
                  b: (c) => <strong>{c}</strong>,
                })}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button onClick={() => setCreds(null)}>{t("ready.saved")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("removeDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("removeDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRemoveOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const r = await removeSelfHostedAction(false)
                  if (r.ok) setRemoveOpen(false)
                  return r
                })
              }
            >
              {t("removeDialog.keepData")}
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const r = await removeSelfHostedAction(true)
                  if (r.ok) setRemoveOpen(false)
                  return r
                })
              }
            >
              {t("removeDialog.withData")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function StatusBadge({
  status,
  t,
}: {
  status: SelfHostedStatus
  t: ReturnType<typeof useTranslations>
}) {
  if (!status.dockerAvailable)
    return <Badge variant="destructive">{t("status.dockerOff")}</Badge>
  if (!status.container.installed)
    return <Badge variant="secondary">{t("status.none")}</Badge>
  if (status.container.running) return <Badge>{t("status.running")}</Badge>
  return <Badge variant="destructive">{status.container.state}</Badge>
}

function CredRow({ label, value }: { label: string; value: string }) {
  const t = useTranslations("registry.selfHosted.ready")
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <code className="min-w-0 flex-1 truncate rounded bg-muted px-1.5 py-0.5">
        {value}
      </code>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("copyLabel", { label })}
        onClick={() =>
          void copyToClipboard(value).then((ok) =>
            ok
              ? toast.success(t("copied", { label }))
              : toast.error(t("copyFailed", { label: label.toLowerCase() }))
          )
        }
      >
        <Copy />
      </Button>
    </div>
  )
}
