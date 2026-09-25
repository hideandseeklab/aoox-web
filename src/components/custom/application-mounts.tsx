"use client"

import {
  FileText,
  FolderOpen,
  HardDrive,
  Plus,
  Save,
  Trash2,
} from "lucide-react"
import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
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
import { Textarea } from "@/components/ui/textarea"
import {
  addMountAction,
  deleteMountAction,
  updateMountAction,
} from "@/features/application/application.actions"
import type {
  Mount,
  MountOwner,
  MountType,
} from "@/features/application/application.entity"

const TYPE_LABEL: Record<MountType, string> = {
  volume: "Volume",
  bind: "Bind (host)",
  file: "File",
}
const TYPE_ICON = { volume: HardDrive, bind: FolderOpen, file: FileText }

/**
 * Volumes (persistent data), host bind mounts (owner/admin) and small config
 * files stored on the platform. Every change re-creates the container on the
 * API side, so it applies immediately without a rebuild.
 */
export function ApplicationMounts({
  owner,
  mounts,
  canBind,
}: {
  owner: MountOwner
  mounts: Mount[]
  canBind: boolean
}) {
  const [type, setType] = useState<MountType>("volume")
  const [name, setName] = useState("")
  const [hostPath, setHostPath] = useState("")
  const [containerPath, setContainerPath] = useState("")
  const [content, setContent] = useState("")
  const [readOnly, setReadOnly] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? "Gagal")
      else {
        setName("")
        setHostPath("")
        setContainerPath("")
        setContent("")
        setReadOnly(false)
      }
    })

  return (
    <div className="space-y-4">
      {mounts.length > 0 && (
        <div className="space-y-3">
          {mounts.map((m) => (
            <MountRow key={m.id} owner={owner} mount={m} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tambah mount</CardTitle>
          <CardDescription>
            <b>Volume</b>: data persisten yang bertahan antar deploy (volume
            Docker bernama). <b>Bind</b>: folder/file di host (hanya
            owner/admin). <b>File</b>: file konfigurasi kecil yang disimpan di
            sini dan di-mount read-only. Perubahan langsung diterapkan dengan
            membuat ulang container
            {owner.kind === "database"
              ? " (restart singkat; data tetap di volume)"
              : " (tanpa build)"}
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              run(() =>
                addMountAction(owner, {
                  type,
                  containerPath: containerPath.trim(),
                  ...(type === "volume" ? { name: name.trim() } : {}),
                  ...(type === "bind"
                    ? { hostPath: hostPath.trim(), readOnly }
                    : {}),
                  ...(type === "file" ? { content } : { readOnly }),
                })
              )
            }}
          >
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="mt-type">Jenis</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as MountType)}
                >
                  <SelectTrigger id="mt-type" className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="volume">Volume</SelectItem>
                    <SelectItem value="bind" disabled={!canBind}>
                      Bind (host)
                    </SelectItem>
                    <SelectItem value="file">File</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {type === "volume" && (
                <div className="space-y-1">
                  <Label htmlFor="mt-name">Nama volume</Label>
                  <Input
                    id="mt-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="uploads"
                    className="w-40 font-mono"
                    required
                  />
                </div>
              )}
              {type === "bind" && (
                <div className="min-w-56 flex-1 space-y-1">
                  <Label htmlFor="mt-host">Path di host</Label>
                  <Input
                    id="mt-host"
                    value={hostPath}
                    onChange={(e) => setHostPath(e.target.value)}
                    placeholder="/srv/app/data"
                    className="font-mono"
                    required
                  />
                </div>
              )}
              <div className="min-w-56 flex-1 space-y-1">
                <Label htmlFor="mt-path">Path di container</Label>
                <Input
                  id="mt-path"
                  value={containerPath}
                  onChange={(e) => setContainerPath(e.target.value)}
                  placeholder={
                    type === "file" ? "/etc/app/config.yml" : "/app/data"
                  }
                  className="font-mono"
                  required
                />
              </div>
              {type !== "file" && (
                <label className="mb-2 flex items-center gap-2 text-sm">
                  <Switch checked={readOnly} onCheckedChange={setReadOnly} />
                  Read-only
                </label>
              )}
            </div>
            {type === "file" && (
              <div className="space-y-1">
                <Label htmlFor="mt-content">Isi file</Label>
                <Textarea
                  id="mt-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  spellCheck={false}
                  className="font-mono text-xs"
                />
              </div>
            )}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                <Plus data-icon="inline-start" />
                {pending ? "Menerapkan…" : "Tambah"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function MountRow({ owner, mount }: { owner: MountOwner; mount: Mount }) {
  const [content, setContent] = useState(mount.content ?? "")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const Icon = TYPE_ICON[mount.type]
  const dirty = mount.type === "file" && content !== (mount.content ?? "")

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? "Gagal")
    })

  const source =
    mount.type === "volume"
      ? `volume ${mount.name}`
      : mount.type === "bind"
        ? mount.hostPath
        : mount.name

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate font-mono text-sm">
              {mount.containerPath}
            </CardTitle>
            <CardDescription className="truncate font-mono text-xs">
              {source}
            </CardDescription>
          </div>
          <Badge variant="outline">{TYPE_LABEL[mount.type]}</Badge>
          {mount.readOnly && <Badge variant="secondary">ro</Badge>}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Hapus mount"
            disabled={pending}
            onClick={() => {
              const purge =
                mount.type === "volume" &&
                confirm(
                  "Hapus juga volume Docker beserta datanya? (Batal = lepas mount saja, data tetap ada)"
                )
              run(() => deleteMountAction(owner, mount.id, purge))
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </CardHeader>
      {mount.type === "file" && (
        <CardContent className="space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={Math.min(20, Math.max(4, content.split("\n").length + 1))}
            spellCheck={false}
            className="font-mono text-xs"
            aria-label={`Isi ${mount.name}`}
          />
          <div className="flex items-center justify-end gap-3">
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={pending || !dirty}
              onClick={() =>
                run(() => updateMountAction(owner, mount.id, { content }))
              }
            >
              <Save data-icon="inline-start" />
              {pending ? "Menerapkan…" : "Simpan & terapkan"}
            </Button>
          </div>
        </CardContent>
      )}
      {mount.type !== "file" && error && (
        <CardContent>
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        </CardContent>
      )}
    </Card>
  )
}
