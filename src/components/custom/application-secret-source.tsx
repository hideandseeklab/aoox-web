"use client"

import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useId, useRef, useState } from "react"
import { toast } from "sonner"
import { PathArrow } from "@/components/custom/arrows"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import {
  previewSecretSourceAction,
  saveSecretSourceAction,
} from "@/features/secret-connection/secret-connection.actions"
import type {
  SecretConnection,
  SecretSource,
} from "@/features/secret-connection/secret-connection.entity"

const NONE = "none"

interface Form {
  connectionId: string
  projectId: string
  environment: string
  path: string
  sync: boolean
}

const fromSource = (s: SecretSource | null): Form => ({
  connectionId: s?.connectionId ?? NONE,
  projectId: s?.projectId ?? "",
  environment: s?.environment ?? "",
  path: s?.path ?? "/",
  sync: s?.sync ?? false,
})

/**
 * "Sumber secret" in the Environment tab: pull secrets from a secret manager
 * connection when the container is created. Anyone with write access to the
 * project can pick a connection (they only see names); creating connections is
 * owner/admin territory in Settings.
 */
export function ApplicationSecretSource({
  applicationId,
  source,
  connections,
  canEdit,
  canManageConnections,
}: {
  applicationId: string
  source: SecretSource | null
  connections: SecretConnection[]
  canEdit: boolean
  canManageConnections: boolean
}) {
  const [saved, setSaved] = useState<SecretSource | null>(source)
  const [form, setForm] = useState<Form>(fromSource(source))
  const [busy, setBusy] = useState<"save" | "preview" | null>(null)
  const [keys, setKeys] = useState<string[] | null>(null)
  const toastId = useRef<string | number | null>(null)
  const ids = {
    connection: useId(),
    project: useId(),
    environment: useId(),
    path: useId(),
    sync: useId(),
  }

  const dirty =
    JSON.stringify(form) !== JSON.stringify(fromSource(saved)) && canEdit
  const active = form.connectionId !== NONE

  async function save() {
    setBusy("save")
    toastId.current = toast.loading("Menyimpan sumber secret…")
    const r = await saveSecretSourceAction(applicationId, {
      connectionId: active ? form.connectionId : null,
      projectId: form.projectId,
      environment: form.environment,
      path: form.path,
      sync: form.sync,
    })
    if (r.ok) {
      setSaved(r.data)
      setForm(fromSource(r.data))
      setKeys(null)
      toast.success(
        r.data ? "Sumber secret disimpan" : "Sumber secret dihapus",
        {
          id: toastId.current,
        }
      )
    } else {
      toast.error(r.error, { id: toastId.current })
    }
    setBusy(null)
  }

  async function preview() {
    setBusy("preview")
    toastId.current = toast.loading("Mengambil daftar key…")
    const r = await previewSecretSourceAction(applicationId)
    if (r.ok) {
      setKeys(r.data.keys)
      toast.success(`${r.data.keys.length} key`, { id: toastId.current })
    } else {
      setKeys(null)
      toast.error(r.error, { id: toastId.current })
    }
    setBusy(null)
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Sumber secret</CardTitle>
        <CardDescription>
          Ambil secret dari secret manager (Infisical) alih-alih menyalinnya ke
          env. Nilai diambil saat container dibuat (deploy, apply config,
          rollback); rujuk satu secret dengan <code>{"${{secret.KEY}}"}</code>{" "}
          di env, atau nyalakan <em>Sync</em> untuk meneruskan semuanya. Env
          aplikasi menang atas secret bila key sama. Preview PR tidak
          mewarisinya. Bila secret manager tidak bisa dijangkau saat deploy,
          deployment gagal dan container lama tetap berjalan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada koneksi secret manager.{" "}
            {canManageConnections ? (
              <>
                Tambahkan di{" "}
                <Link
                  href="/settings?tab=integrations"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Settings
                  <PathArrow />
                  Integrasi
                </Link>
                .
              </>
            ) : (
              <>
                Minta owner/admin menambahkannya di Settings
                <PathArrow />
                Integrasi.
              </>
            )}
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor={ids.connection}>Koneksi</Label>
                <Select
                  value={form.connectionId}
                  disabled={!canEdit}
                  onValueChange={(v) => setForm({ ...form, connectionId: v })}
                >
                  <SelectTrigger id={ids.connection} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Tidak dipakai</SelectItem>
                    {connections.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {active && (
                <>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor={ids.project}>Project ID</Label>
                    <Input
                      id={ids.project}
                      value={form.projectId}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setForm({ ...form, projectId: e.target.value })
                      }
                      className="font-mono text-xs"
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={ids.environment}>Environment</Label>
                    <Input
                      id={ids.environment}
                      value={form.environment}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setForm({ ...form, environment: e.target.value })
                      }
                      placeholder="prod"
                      className="font-mono text-xs"
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={ids.path}>Path</Label>
                    <Input
                      id={ids.path}
                      value={form.path}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setForm({ ...form, path: e.target.value })
                      }
                      placeholder="/"
                      className="font-mono text-xs"
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Switch
                      id={ids.sync}
                      checked={form.sync}
                      disabled={!canEdit}
                      onCheckedChange={(v) => setForm({ ...form, sync: v })}
                    />
                    <Label htmlFor={ids.sync} className="text-xs">
                      Sync semua secret ke container
                    </Label>
                  </div>
                </>
              )}
            </div>

            {canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => void save()}
                  disabled={!dirty || busy !== null}
                >
                  {busy === "save" && (
                    <Loader2
                      data-icon="inline-start"
                      className="animate-spin"
                    />
                  )}
                  Simpan
                </Button>
                {saved && (
                  <Button
                    variant="outline"
                    onClick={() => void preview()}
                    disabled={busy !== null || dirty}
                    title={dirty ? "Simpan perubahan dulu" : undefined}
                  >
                    {busy === "preview" && (
                      <Loader2
                        data-icon="inline-start"
                        className="animate-spin"
                      />
                    )}
                    Lihat key
                  </Button>
                )}
              </div>
            )}

            {keys && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  {keys.length === 0
                    ? "Tidak ada secret di path ini."
                    : `${keys.length} key (hanya nama, nilai tidak ditampilkan):`}
                </p>
                {keys.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {keys.map((k) => (
                      <li
                        key={k}
                        className="rounded-md border px-1.5 py-0.5 font-mono text-xs"
                      >
                        {k}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
