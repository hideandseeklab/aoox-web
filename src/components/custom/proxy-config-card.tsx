"use client"

import { FileCode2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { usePathname } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import {
  ProxyConfigEditor,
  type EditorTarget,
} from "@/components/custom/proxy-config-editor"
import { ProxyConfigPresetDialog } from "@/components/custom/proxy-config-preset-dialog"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  deleteProxyConfigAction,
  proxyConfigStateAction,
  syncProxyConfigAction,
  updateProxyConfigAction,
} from "@/features/proxy-config/proxy-config.actions"
import type {
  ProxyConfigFile,
  ProxyPreset,
} from "@/features/proxy-config/proxy-config.entity"
import type { Server } from "@/features/server/server.entity"
import { useRouter } from "@/lib/use-router"

const HOST = "host"

/**
 * Operator-written Traefik dynamic configuration for one proxy (the aoox host or a remote
 * server). Each file is stored in aoox and written to the proxy as `user-<name>.yml`; Traefik
 * reloads it live. Only the owner can change anything; admins can read.
 */
export function ProxyConfigCard({
  files,
  presets,
  servers,
  serverId,
  isOwner,
}: {
  files: ProxyConfigFile[]
  presets: ProxyPreset[]
  servers: Server[]
  serverId: string | null
  isOwner: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [target, setTarget] = useState<EditorTarget | null>(null)
  const [pending, start] = useTransition()
  const [ask, setAsk] = useState<{
    resolve: (accepted: boolean | null) => void
  } | null>(null)

  // A proxy from an older aoox is recreated once when the first file is written: ask first.
  const consent = async (willWrite: boolean): Promise<boolean | null> => {
    if (!willWrite) return false
    const s = await proxyConfigStateAction(serverId)
    if (!s.ok || !s.data.needsRecreate) return false
    return new Promise((resolve) => setAsk({ resolve }))
  }

  const go = (next: string) =>
    router.replace(next === HOST ? pathname : `${pathname}?server=${next}`)

  const toggle = (f: ProxyConfigFile, enabled: boolean) =>
    start(async () => {
      const accept = await consent(enabled)
      if (accept === null) return
      const r = await updateProxyConfigAction(f.id, {
        enabled,
        acceptProxyRestart: accept,
      })
      if (!r.ok) return void toast.error(r.error)
      if (r.data.sync.warning) toast.warning(r.data.sync.warning)
      router.refresh()
    })

  const resync = () =>
    start(async () => {
      const accept = await consent(files.some((f) => f.enabled))
      if (accept === null) return
      const r = await syncProxyConfigAction(serverId, accept)
      if (!r.ok) return void toast.error(r.error)
      if (r.data.notice) toast.info(r.data.notice)
      toast.success(
        r.data.warning ?? `${r.data.files} berkas ditulis ulang ke proxy`
      )
    })

  const remote = serverId !== null
  const close = () => {
    setTarget(null)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Konfigurasi dinamis</CardTitle>
            <CardDescription>
              Middleware, router, dan service Traefik buatan sendiri (basic
              auth, header keamanan, rate limit, allowlist IP, redirect www).
              Middleware dipasang per domain di tab Domain aplikasi. Hanya
              konfigurasi dinamis; konfigurasi statis dan sertifikat tidak
              diubah di sini.
            </CardDescription>
          </div>
          {isOwner && (
            <div className="flex flex-wrap gap-2">
              <ProxyConfigPresetDialog
                presets={presets}
                onResult={(name, content) =>
                  setTarget({ mode: "new", name, content })
                }
              />
              <Button size="sm" onClick={() => setTarget({ mode: "new" })}>
                <Plus data-icon="inline-start" />
                Berkas baru
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Proxy di</span>
          <Select value={serverId ?? HOST} onValueChange={go}>
            <SelectTrigger size="sm" className="w-56" aria-label="Pilih proxy">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={HOST}>Host aoox</SelectItem>
              {servers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} · {s.host}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              className="ms-auto"
              disabled={pending}
              onClick={resync}
              title="Tulis ulang semua berkas aktif ke proxy (mis. setelah restore atau proxy dibuat ulang)"
            >
              <RefreshCw data-icon="inline-start" />
              Terapkan ulang
            </Button>
          )}
        </div>
        {remote && (
          <p className="text-muted-foreground">
            Server remote: fitur ini ditulis untuk server remote tetapi belum
            diuji di sana. Pastikan proxy-nya terpasang di Infrastruktur →
            Server remote.
          </p>
        )}
        <p className="text-muted-foreground">
          Berkas yang salah ditolak Traefik dan dikembalikan otomatis, tetapi
          konfigurasi yang valid dapat mengubah perutean semua domain di proxy
          ini. Nama middleware, router, dan service harus unik per proxy.
          Traefik tidak melaporkan semua nilai yang keliru (mis. URL service
          yang tidak valid), jadi cek hasilnya setelah menyimpan.
        </p>
        {files.length === 0 ? (
          <p className="text-muted-foreground">
            Belum ada berkas konfigurasi
            {isOwner ? " — buat dari preset atau tulis sendiri." : "."}
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {files.map((f) => (
              <li key={f.id} className="space-y-1 px-3 py-2">
                <div className="flex items-center gap-3">
                  <FileCode2 className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 truncate font-medium">{f.name}</span>
                  <code className="min-w-0 truncate text-muted-foreground">
                    {f.fileName}
                  </code>
                  {f.usedByDomains > 0 && (
                    <Badge variant="outline">
                      dipakai {f.usedByDomains} domain
                    </Badge>
                  )}
                  <span className="ms-auto" />
                  <Switch
                    checked={f.enabled}
                    disabled={!isOwner || pending}
                    onCheckedChange={(v) => toggle(f, v)}
                    aria-label={`Aktifkan ${f.name}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${isOwner ? "Ubah" : "Lihat"} ${f.name}`}
                    onClick={() => setTarget({ mode: "edit", file: f })}
                  >
                    <Pencil />
                  </Button>
                  {isOwner && (
                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Hapus ${f.name}`}
                        >
                          <Trash2 />
                        </Button>
                      }
                      title={`Hapus ${f.fileName}?`}
                      description={
                        f.usedByDomains > 0
                          ? `Middleware dari berkas ini masih dipakai ${f.usedByDomains} domain, jadi tidak bisa dihapus. Lepas dari domain-nya dulu.`
                          : "Berkas dihapus dari aoox dan dari proxy. Ini tidak bisa dibatalkan."
                      }
                      confirmLabel="Hapus"
                      onConfirm={async () => {
                        const r = await deleteProxyConfigAction(f.id)
                        if (r.ok) router.refresh()
                        return r
                      }}
                    />
                  )}
                </div>
                <p className="truncate text-muted-foreground">
                  {[
                    f.middlewares.length > 0 &&
                      `middleware: ${f.middlewares.map((m) => `${m}@file`).join(", ")}`,
                    f.routers.length > 0 && `router: ${f.routers.join(", ")}`,
                    f.services.length > 0 &&
                      `service: ${f.services.join(", ")}`,
                    !f.enabled && "nonaktif",
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <ProxyConfigEditor
        target={target}
        serverId={serverId}
        canWrite={isOwner}
        consent={consent}
        onClose={close}
      />
      <ConfirmDialog
        open={ask !== null}
        onOpenChange={(open) => {
          if (!open && ask) {
            ask.resolve(null)
            setAsk(null)
          }
        }}
        tone="neutral"
        title="Proxy akan dibuat ulang sekali?"
        description="Proxy di server ini dibuat oleh aoox versi lama, jadi harus dibuat ulang satu kali agar bisa memuat konfigurasi dinamis: beberapa detik tanpa layanan untuk semua domain di proxy ini. Sertifikat dan rute lain tetap. Peringatan ini hanya muncul sekali."
        confirmLabel="Buat ulang proxy dan simpan"
        onConfirm={async () => {
          ask?.resolve(true)
          setAsk(null)
        }}
      />
    </Card>
  )
}
