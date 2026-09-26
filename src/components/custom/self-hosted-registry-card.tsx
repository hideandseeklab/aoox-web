"use client"

import { Copy, Play, Trash2, Trash } from "lucide-react"
import { useState, useTransition } from "react"
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
  garbageCollectAction,
  provisionSelfHostedAction,
  removeSelfHostedAction,
  setRegistryDomainAction,
} from "@/features/registry/registry.actions"
import type {
  ProvisionResult,
  SelfHostedStatus,
} from "@/features/registry/registry.entity"

export function SelfHostedRegistryCard({
  status,
  canManage,
}: {
  status: SelfHostedStatus
  canManage: boolean
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [creds, setCreds] = useState<ProvisionResult | null>(null)
  const [gcOutput, setGcOutput] = useState<string | null>(null)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [domainInput, setDomainInput] = useState("")

  const { container, registry, dockerAvailable, publicUrl } = status
  const installed = container.installed && registry !== null

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? "Gagal")
    })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Registry lokal</CardTitle>
            <CardDescription>
              Container <code>registry:3</code> yang dikelola aoox. Alamat
              push: <code className="text-foreground">{publicUrl}</code>
            </CardDescription>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!dockerAvailable && (
          <Alert>
            <AlertTitle>Docker tidak terjangkau</AlertTitle>
            <AlertDescription>
              API tidak bisa mengakses Docker engine (cek{" "}
              <code>DOCKER_SOCKET</code>
              dan mount socket di container).
            </AlertDescription>
          </Alert>
        )}
        {installed && registry && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Username</dt>
            <dd className="font-mono">{registry.username}</dd>
            <dt className="text-muted-foreground">Container</dt>
            <dd className="font-mono">
              {container.containerId?.slice(0, 12)} · {container.state}
            </dd>
            <dt className="text-muted-foreground">Login</dt>
            <dd className="font-mono">
              docker login {publicUrl} -u {registry.username}
            </dd>
            {registry.domain && (
              <>
                <dt className="text-muted-foreground">Domain</dt>
                <dd className="font-mono">{registry.domain}</dd>
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
              <Label htmlFor="registry-domain">Domain kustom</Label>
              <Input
                id="registry-domain"
                placeholder="registry.example.com"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                disabled={pending}
              />
            </div>
            <Button type="submit" size="sm" disabled={pending || !domainInput.trim()}>
              Terapkan
            </Button>
            {registry?.domain && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => run(() => setRegistryDomainAction(registry.id, null))}
              >
                Hapus domain
              </Button>
            )}
            <p className="w-full text-xs text-muted-foreground">
              Butuh reverse proxy sudah di-provision dengan email ACME diisi —
              tanpa itu sertifikat tidak terbit dan <code>docker push</code>{" "}
              akan menolak domainnya.
            </p>
          </form>
        )}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {gcOutput !== null && (
          <pre className="max-h-48 overflow-auto rounded-md border bg-muted p-2 text-xs">
            {gcOutput || "(tidak ada output)"}
          </pre>
        )}
      </CardContent>
      {canManage && (
        <CardFooter className="flex flex-wrap gap-2">
          {!installed ? (
            <Button
              disabled={pending || !dockerAvailable}
              onClick={() =>
                run(async () => {
                  const r = await provisionSelfHostedAction()
                  if (r.ok) setCreds(r.data)
                  return r
                })
              }
            >
              <Play data-icon="inline-start" />
              {pending ? "Menyiapkan…" : "Provision registry"}
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
                GC (dry-run)
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
                Garbage collect
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={() => setRemoveOpen(true)}
              >
                <Trash2 data-icon="inline-start" />
                Hapus registry
              </Button>
            </>
          )}
        </CardFooter>
      )}

      <Dialog open={creds !== null} onOpenChange={(o) => !o && setCreds(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registry siap</DialogTitle>
            <DialogDescription>
              Simpan password ini sekarang — hanya ditampilkan sekali. Setelah
              itu disimpan terenkripsi di server.
            </DialogDescription>
          </DialogHeader>
          {creds && (
            <div className="space-y-2 text-sm">
              <CredRow label="Alamat" value={creds.registry.url} />
              <CredRow label="Username" value={creds.username} />
              <CredRow label="Password" value={creds.password} />
              <CredRow
                label="Login"
                value={`docker login ${creds.registry.url} -u ${creds.username}`}
              />
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCreds(null)}>Sudah saya simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus registry lokal?</DialogTitle>
            <DialogDescription>
              Container dihentikan dan dihapus. Pilih apakah data image ikut
              dihapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRemoveOpen(false)}>
              Batal
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
              Hapus, simpan data
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
              Hapus beserta data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function StatusBadge({ status }: { status: SelfHostedStatus }) {
  if (!status.dockerAvailable)
    return <Badge variant="destructive">Docker off</Badge>
  if (!status.container.installed)
    return <Badge variant="secondary">Belum ada</Badge>
  if (status.container.running) return <Badge>Running</Badge>
  return <Badge variant="destructive">{status.container.state}</Badge>
}

function CredRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <code className="min-w-0 flex-1 truncate rounded bg-muted px-1.5 py-0.5">
        {value}
      </code>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Salin ${label}`}
        onClick={() => void navigator.clipboard.writeText(value)}
      >
        <Copy />
      </Button>
    </div>
  )
}
