"use client"

import {
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { useBrowserHost } from "@/components/custom/use-browser-host"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
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
import { Switch } from "@/components/ui/switch"
import {
  deleteCompanionAction,
  getCompanionCredentialsAction,
  installCompanionAction,
} from "@/features/database-companion/database-companion.actions"
import type {
  CompanionCredentials,
  CompanionTool,
  DatabaseCompanion,
} from "@/features/database-companion/database-companion.entity"
import { companionSchema } from "@/features/database-companion/database-companion.schema"
import type { ManagedDatabaseDetail } from "@/features/managed-database/managed-database.entity"
import { copyToClipboard } from "@/lib/clipboard"
import { cn } from "@/lib/utils"

export function DatabaseCompanionCard({
  db,
  companion,
  tools,
  running,
}: {
  db: ManagedDatabaseDetail
  companion: DatabaseCompanion | null
  tools: CompanionTool[]
  running: boolean
}) {
  const router = useRouter()
  const canManage = db.projectRole !== "viewer"
  const [installOpen, setInstallOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pending, start] = useTransition()
  const [creds, setCreds] = useState<CompanionCredentials | null>(null)
  const browserHost = useBrowserHost()

  const status = companion?.status
  // Refresh until the API reports a terminal status (same pattern as the database panel).
  useEffect(() => {
    if (status !== "creating") return
    const t = setInterval(() => router.refresh(), 3000)
    return () => clearInterval(t)
  }, [status, router])

  // Credentials live only in memory and are dropped when the companion changes.
  const companionId = companion?.id
  const [credsFor, setCredsFor] = useState(companionId)
  if (credsFor !== companionId) {
    setCredsFor(companionId)
    setCreds(null)
  }

  if (!companion && tools.length === 0) return null

  const tool = companion
    ? tools.find((t) => t.id === companion.tool)
    : undefined
  const toolLabel = tool?.label ?? companion?.tool ?? ""
  const url = companion
    ? (companion.url ??
      (companion.hostPort && browserHost
        ? `http://${browserHost}:${companion.hostPort}`
        : null))
    : null

  const showCreds = () =>
    start(async () => {
      const r = await getCompanionCredentialsAction(db.id)
      if (r.ok) setCreds(r.data)
      else toast.error(r.error)
    })

  const remove = () =>
    start(async () => {
      const r = await deleteCompanionAction(db.id)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success("Admin UI dihapus")
      setDeleteOpen(false)
      router.refresh()
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin UI</CardTitle>
        <CardDescription>
          Antarmuka web untuk mengelola database ini, berjalan di container
          terpisah.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {!companion ? (
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Belum ada Admin UI. Pasang dengan satu klik, lalu buka dari domain
              atau IP dan port.
            </p>
            {canManage ? (
              <>
                <Button
                  disabled={!running}
                  onClick={() => setInstallOpen(true)}
                >
                  <Plus data-icon="inline-start" />
                  Pasang Admin UI
                </Button>
                {!running && (
                  <p className="text-muted-foreground">
                    Jalankan database terlebih dahulu.
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">
                Hanya developer ke atas yang bisa memasang Admin UI.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{toolLabel}</span>
              <Badge
                variant={
                  companion.status === "error"
                    ? "destructive"
                    : companion.status === "running"
                      ? "default"
                      : "secondary"
                }
              >
                {companion.status === "creating" && (
                  <Loader2 className="animate-spin" />
                )}
                {companion.status}
              </Badge>
            </div>
            {companion.status === "error" && companion.errorMessage && (
              <p
                className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive"
                role="alert"
              >
                {companion.errorMessage}
              </p>
            )}
            {url && (
              <div className="flex min-w-0 items-center gap-2">
                <span className="w-20 shrink-0 text-muted-foreground">URL</span>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Buka ${toolLabel} di tab baru`}
                  className="flex min-w-0 items-center gap-1 font-mono hover:underline"
                >
                  <span className="truncate">{url}</span>
                  <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                </a>
              </div>
            )}
            {canManage && (
              <div className="space-y-2">
                {tool?.usesDatabaseLogin ? (
                  <p className="text-muted-foreground">
                    Masuk dengan username dan password database (lihat kartu
                    Koneksi internal, tombol Tampilkan password).
                  </p>
                ) : creds ? (
                  <div className="space-y-2">
                    <CredRow label="User" value={creds.username} />
                    <CredRow label="Password" value={creds.password} />
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  {!tool?.usesDatabaseLogin &&
                    (creds ? (
                      <Button variant="outline" onClick={() => setCreds(null)}>
                        <EyeOff data-icon="inline-start" />
                        Sembunyikan kredensial
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        disabled={pending}
                        onClick={showCreds}
                      >
                        <Eye data-icon="inline-start" />
                        Tampilkan kredensial
                      </Button>
                    ))}
                  <Button
                    variant="destructive"
                    disabled={pending}
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 data-icon="inline-start" />
                    Hapus Admin UI
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {canManage && (
        <InstallDialog
          open={installOpen}
          onOpenChange={setInstallOpen}
          dbId={db.id}
          tools={tools}
        />
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Admin UI?</DialogTitle>
            <DialogDescription>
              Container {toolLabel} dihentikan dan dihapus. Data database tidak
              terpengaruh.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" disabled={pending} onClick={remove}>
              {pending && (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              )}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function CredRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <code className="min-w-0 flex-1 truncate rounded bg-muted px-1.5 py-0.5 text-xs">
        {value ?? "-"}
      </code>
      {value && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Salin ${label}`}
          onClick={() =>
            void copyToClipboard(value).then((ok) =>
              ok
                ? toast.success(`${label} disalin`)
                : toast.error(`Gagal menyalin ${label.toLowerCase()}`)
            )
          }
        >
          <Copy />
        </Button>
      )}
    </div>
  )
}

type Access = "domain" | "port"

function InstallDialog({
  open,
  onOpenChange,
  dbId,
  tools,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  dbId: string
  tools: CompanionTool[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const toastId = useRef<string | number | undefined>(undefined)
  const [tool, setTool] = useState("")
  const [access, setAccess] = useState<Access>("domain")
  const [host, setHost] = useState("")
  const [https, setHttps] = useState(true)
  const [hostPort, setHostPort] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = companionSchema.safeParse({
      tool,
      access,
      host,
      https,
      hostPort,
    })
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const i of parsed.error.issues) {
        next[String(i.path[0])] ??= i.message
      }
      return setErrors(next)
    }
    setErrors({})
    toastId.current = toast.loading("Memasang Admin UI…")
    start(async () => {
      const r = await installCompanionAction(dbId, parsed.data)
      if (!r.ok) {
        toast.error(r.error, { id: toastId.current })
        return
      }
      toast.success(
        "Admin UI sedang disiapkan, pull image bisa beberapa menit",
        { id: toastId.current }
      )
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
        showCloseButton={!pending}
      >
        <DialogHeader>
          <DialogTitle>Pasang Admin UI</DialogTitle>
          <DialogDescription>Pilih alat dan cara membukanya.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <Label id="companion-tool-label">Alat</Label>
            <div
              role="radiogroup"
              aria-labelledby="companion-tool-label"
              className="space-y-2"
            >
              {tools.map((t) => (
                <Choice
                  key={t.id}
                  checked={tool === t.id}
                  onSelect={() => setTool(t.id)}
                  title={t.label}
                  description={t.description}
                  note={
                    t.usesDatabaseLogin
                      ? "Masuk dengan login database"
                      : "Password dibuat otomatis"
                  }
                />
              ))}
            </div>
            {errors.tool && (
              <p className="text-destructive" role="alert">
                {errors.tool}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label id="companion-access-label">Akses</Label>
            <div
              role="radiogroup"
              aria-labelledby="companion-access-label"
              className="grid gap-2 sm:grid-cols-2"
            >
              <Choice
                checked={access === "domain"}
                onSelect={() => setAccess("domain")}
                title="Domain"
                description="Lewat reverse proxy dengan hostname sendiri."
              />
              <Choice
                checked={access === "port"}
                onSelect={() => setAccess("port")}
                title="IP & port"
                description="Dipublikasikan di port host server ini."
              />
            </div>
          </div>

          {access === "domain" ? (
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="companion-host">Hostname</Label>
                <Input
                  id="companion-host"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="db.example.com"
                  aria-invalid={!!errors.host}
                />
                {errors.host && (
                  <p className="text-destructive" role="alert">
                    {errors.host}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="companion-https"
                  checked={https}
                  onCheckedChange={setHttps}
                />
                <Label htmlFor="companion-https">HTTPS</Label>
              </div>
              <p className="text-muted-foreground">
                Reverse proxy harus aktif dan DNS hostname sudah mengarah ke IP
                server ini.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="companion-port">Port host</Label>
              <Input
                id="companion-port"
                inputMode="numeric"
                value={hostPort}
                onChange={(e) => setHostPort(e.target.value)}
                placeholder="8081"
                aria-invalid={!!errors.hostPort}
              />
              {errors.hostPort && (
                <p className="text-destructive" role="alert">
                  {errors.hostPort}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              )}
              {pending ? "Memasang…" : "Pasang"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Choice({
  checked,
  onSelect,
  title,
  description,
  note,
}: {
  checked: boolean
  onSelect: () => void
  title: string
  description: string
  note?: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border p-2 text-left text-xs transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        checked && "border-primary bg-muted"
      )}
    >
      <span className="block text-sm font-medium">{title}</span>
      <span className="block text-muted-foreground">{description}</span>
      {note && <span className="mt-1 block">{note}</span>}
    </button>
  )
}
