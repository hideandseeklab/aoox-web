"use client"

import {
  Copy,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Play,
  Trash2,
  Trash,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState, useTransition } from "react"
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
  resetRegistryPasswordAction,
  revealRegistryPasswordAction,
  setRegistryDomainAction,
} from "@/features/registry/registry.actions"
import type {
  ProvisionResult,
  ResetPasswordResult,
  SelfHostedStatus,
} from "@/features/registry/registry.entity"
import { copyToClipboard } from "@/lib/clipboard"
import { IllustratedEmptyState } from "@/components/custom/illustrated-empty-state"
import { RegistryIllustration } from "@/components/custom/illustrations/registry-illustration"

/** A revealed password hides itself again after this long (same idea as the variables page). */
const REVEAL_TTL_MS = 60_000

export function SelfHostedRegistryCard({
  status,
  canManage,
  isOwner,
  destinations,
}: {
  status: SelfHostedStatus
  /** Owner or admin: may change the domain (API `@Roles('owner','admin')`). */
  canManage: boolean
  /** Owner only: enable, replace, remove and garbage-collect (API `@Roles('owner')`). */
  isOwner: boolean
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
  const [replaceMode, setReplaceMode] = useState(false)
  const [revealed, setRevealed] = useState<string | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetDone, setResetDone] = useState<ResetPasswordResult | null>(null)

  useEffect(() => {
    if (revealed === null) return
    const timer = setTimeout(() => setRevealed(null), REVEAL_TTL_MS)
    return () => clearTimeout(timer)
  }, [revealed])

  const togglePassword = (registryId: string) => {
    if (revealed !== null) {
      setRevealed(null)
      return
    }
    start(async () => {
      setError(null)
      const r = await revealRegistryPasswordAction(registryId)
      if (r.ok && r.data.password) setRevealed(r.data.password)
      else setError(r.ok ? t("passwordLoadFailed") : r.error)
    })
  }

  const openProvision = (replace: boolean) => {
    setReplaceMode(replace)
    setProvisionOpen(true)
  }

  const {
    container,
    registry,
    dockerAvailable,
    publicUrl,
    localOnly,
    externalAddress,
  } = status
  const installed =
    registry !== null &&
    (status.state === "installed" || status.state === "docker-unavailable")
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

  const dialogs = (
    <>
      <Dialog open={provisionOpen} onOpenChange={setProvisionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {replaceMode ? t("unmanaged.dialogTitle") : t("provision.title")}
            </DialogTitle>
            <DialogDescription>
              {replaceMode
                ? t.rich("unmanaged.dialogDescription", {
                    code: (c) => <code>{c}</code>,
                  })
                : t("provision.description")}
            </DialogDescription>
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
                    destinationId === "local" ? undefined : destinationId,
                    replaceMode
                  )
                  if (r.ok) {
                    setCreds(r.data)
                    setProvisionOpen(false)
                  }

                  return r
                })
              }
            >
              {pending
                ? replaceMode
                  ? t("unmanaged.replacing")
                  : t("provision.preparing")
                : replaceMode
                  ? t("unmanaged.dialogConfirm")
                  : t("provision.confirm")}
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
            <div className="min-w-0 space-y-2 text-xs">
              <CredRow label={t("ready.address")} value={creds.registry.url} />
              {externalAddress && externalAddress !== creds.registry.url && (
                <CredRow label={t("otherMachines")} value={externalAddress} />
              )}
              <CredRow label={t("username")} value={creds.username} />
              <CredRow label={t("ready.password")} value={creds.password} />
              <CredRow
                label={t("login")}
                value={`docker login ${externalAddress ?? creds.registry.url} -u ${creds.username}`}
              />
            </div>
          )}
          {creds?.registry.url.startsWith("localhost:") && !externalAddress && (
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

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("reset.title")}</DialogTitle>
            <DialogDescription>
              {t.rich("reset.description", { code: (c) => <code>{c}</code> })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const r = await resetRegistryPasswordAction()
                  if (r.ok) {
                    setResetOpen(false)
                    setRevealed(null)
                    setResetDone(r.data)
                  }
                  return r
                })
              }
            >
              {pending ? t("reset.resetting") : t("reset.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetDone !== null}
        onOpenChange={(o) => !o && setResetDone(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("reset.doneTitle")}</DialogTitle>
            <DialogDescription>
              {t.rich("reset.doneDescription", {
                code: (c) => <code>{c}</code>,
              })}
            </DialogDescription>
          </DialogHeader>
          {resetDone && registry && (
            <div className="min-w-0 space-y-2 text-xs">
              <CredRow label={t("username")} value={resetDone.username} />
              <CredRow label={t("ready.password")} value={resetDone.password} />
              <CredRow
                label={t("login")}
                value={`docker login ${externalAddress ?? registry.url} -u ${resetDone.username}`}
              />
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setResetDone(null)}>
              {t("reset.done")}
            </Button>
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
    </>
  )

  const dockerAlert = !dockerAvailable && (
    <Alert>
      <AlertTitle>{t("dockerUnavailable.title")}</AlertTitle>
      <AlertDescription>
        {t.rich("dockerUnavailable.description", {
          code: (c) => <code>{c}</code>,
        })}
      </AlertDescription>
    </Alert>
  )

  // Not enabled yet: the shared illustrated empty state, with the same Enable flow.
  if (!installed) {
    const unmanaged = status.state === "unmanaged-container"
    const missing = status.state === "missing-container"
    return (
      <div className="space-y-3">
        {dockerAlert}
        {unmanaged && (
          <Alert>
            <Info />
            <AlertTitle>{t("unmanaged.title")}</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                {t.rich(
                  isOwner
                    ? "unmanaged.description"
                    : "unmanaged.descriptionMember",
                  { code: (c) => <code>{c}</code> }
                )}
              </p>
              {isOwner && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => openProvision(true)}
                >
                  {t("unmanaged.replace")}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
        {missing && (
          <Alert>
            <Info />
            <AlertTitle>{t("missing.title")}</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                {t.rich(
                  isOwner ? "missing.description" : "missing.descriptionMember",
                  { code: (c) => <code>{c}</code> }
                )}
              </p>
              {isOwner && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => run(() => removeSelfHostedAction(false))}
                >
                  {t("missing.action")}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
        <IllustratedEmptyState
          illustration={<RegistryIllustration />}
          title={t("empty.title")}
          description={
            <>
              {isOwner ? t("empty.body") : t("empty.bodyMember")}{" "}
              {t.rich("empty.address", {
                addr: (c) => <code className="font-mono">{c}</code>,
                url: publicUrl,
              })}
            </>
          }
          actions={
            isOwner && !unmanaged && !missing ? (
              <Button
                disabled={pending || !dockerAvailable}
                onClick={() => openProvision(false)}
              >
                <Play data-icon="inline-start" />
                {t("enable")}
              </Button>
            ) : undefined
          }
        />
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        {dialogs}
      </div>
    )
  }

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
        {dockerAlert}
        {registry && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
            <dt className="text-muted-foreground">{t("address")}</dt>
            <dd className="font-mono">
              {registry.url}
              {localOnly && !registry.domain && (
                <span className="ml-2 font-sans text-muted-foreground">
                  ({t("thisServerOnly")})
                </span>
              )}
            </dd>
            {externalAddress && externalAddress !== registry.url && (
              <>
                <dt className="text-muted-foreground">{t("otherMachines")}</dt>
                <dd className="font-mono">{externalAddress}</dd>
              </>
            )}
            <dt className="text-muted-foreground">{t("username")}</dt>
            <dd className="font-mono">{registry.username}</dd>
            {canManage && (
              <>
                <dt className="text-muted-foreground">{t("password")}</dt>
                <dd className="-my-1 flex min-w-0 items-center gap-1">
                  <code className="min-w-0 truncate font-mono">
                    {revealed ?? "••••••••••••"}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={pending}
                    aria-label={
                      revealed === null ? t("showPassword") : t("hidePassword")
                    }
                    onClick={() => togglePassword(registry.id)}
                  >
                    {revealed === null ? <Eye /> : <EyeOff />}
                  </Button>
                  {revealed !== null && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("copyPassword")}
                      onClick={() =>
                        void copyToClipboard(revealed).then((ok) =>
                          ok
                            ? toast.success(t("passwordCopied"))
                            : toast.error(t("failed"))
                        )
                      }
                    >
                      <Copy />
                    </Button>
                  )}
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">{t("container")}</dt>
            <dd className="font-mono">
              {container.containerId?.slice(0, 12)} · {container.state}
            </dd>
            <dt className="text-muted-foreground">{t("login")}</dt>
            <dd className="font-mono">
              docker login {externalAddress ?? registry.url} -u{" "}
              {registry.username}
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
        {registry && !registry.domain && localOnly && (
          <Alert>
            <Info />
            <AlertDescription>
              {t.rich("localOnlyHint", {
                code: (c) => <code>{c}</code>,
                b: (c) => <strong>{c}</strong>,
              })}
            </AlertDescription>
          </Alert>
        )}
        {registry && !registry.domain && !localOnly && (
          <Alert>
            <Info />
            <AlertDescription>
              {t.rich(
                externalAddress ? "exposedInsecureNote" : "exposedNoAddress",
                { code: (c) => <code>{c}</code> }
              )}
            </AlertDescription>
          </Alert>
        )}
        {canManage && (
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
      {isOwner && (
        <CardFooter className="flex flex-wrap gap-2">
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setResetOpen(true)}
            >
              <KeyRound data-icon="inline-start" />
              {t("reset.button")}
            </Button>
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
        </CardFooter>
      )}

      {dialogs}
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
  if (status.state === "unmanaged-container")
    return <Badge variant="secondary">{t("status.unmanaged")}</Badge>
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
