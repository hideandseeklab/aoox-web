"use client"

import { BookOpen, Check, Copy, KeySquare, Plus, Trash2 } from "lucide-react"
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
import {
  createApiTokenAction,
  deleteApiTokenAction,
} from "@/features/api-token/api-token.actions"
import type { ApiToken } from "@/features/api-token/api-token.entity"
import { Switch } from "@/components/ui/switch"

const EXPIRY: { label: string; days: number | null }[] = [
  { label: "30 hari", days: 30 },
  { label: "90 hari", days: 90 },
  { label: "1 tahun", days: 365 },
  { label: "Tidak kedaluwarsa", days: null },
]

function fmt(d: string | null) {
  return d
    ? new Date(d).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—"
}

/**
 * Personal access tokens for CI/CLI. The plaintext appears once in a dialog
 * after creation; the list only shows the prefix.
 */
export function ApiTokensCard({
  tokens,
  publicApiUrl,
  projects = [],
}: {
  tokens: ApiToken[]
  /** For the scope picker and the badges; empty hides the picker. */
  projects?: { id: string; name: string }[]
  publicApiUrl: string
}) {
  const [name, setName] = useState("")
  const [expiry, setExpiry] = useState("30")
  const [created, setCreated] = useState<string | null>(null)
  const [readOnly, setReadOnly] = useState(false)
  // Empty = every project the user may see (and platform settings stay usable).
  const [scopeProjects, setScopeProjects] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  // Read once per render (React Compiler forbids Date.now() inside the map).
  const [now] = useState(() => Date.now())

  const copy = async () => {
    if (!created) return
    try {
      await navigator.clipboard.writeText(created)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked: the token stays visible to select manually */
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API token</CardTitle>
        <CardDescription>
          Token akses pribadi untuk CI/CLI — bertindak sebagai akunmu (role
          sama). Pakai sebagai <code>Authorization: Bearer aoox_…</code>.
          Dokumentasi endpoint:{" "}
          <a
            href={`${publicApiUrl}/docs`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 underline"
          >
            <BookOpen className="size-3" /> {publicApiUrl}/docs
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tokens.length > 0 && (
          <ul className="divide-y rounded-md border text-sm">
            {tokens.map((t) => {
              const expired =
                t.expiresAt && new Date(t.expiresAt).getTime() < now
              return (
                <li key={t.id} className="flex items-center gap-3 px-3 py-2">
                  <KeySquare className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{t.name}</span>
                    <span className="block truncate font-mono text-xs text-muted-foreground">
                      {t.prefix}… · dipakai {fmt(t.lastUsedAt)} ·{" "}
                      {t.expiresAt
                        ? `berlaku sampai ${fmt(t.expiresAt)}`
                        : "tanpa kedaluwarsa"}
                    </span>
                  </span>
                  {t.readOnly && <Badge variant="outline">baca saja</Badge>}
                  {t.projectIds && (
                    <Badge
                      variant="outline"
                      title={t.projectIds
                        .map(
                          (id) => projects.find((p) => p.id === id)?.name ?? id
                        )
                        .join(", ")}
                    >
                      {t.projectIds.length} project
                    </Badge>
                  )}
                  {expired && <Badge variant="destructive">kedaluwarsa</Badge>}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Cabut token"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        setError(null)
                        const r = await deleteApiTokenAction(t.id)
                        if (!r.ok) setError(r.error)
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}

        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              setError(null)
              const r = await createApiTokenAction(
                name.trim(),
                expiry === "never" ? null : Number(expiry),
                { readOnly, projectIds: scopeProjects }
              )
              if (!r.ok) setError(r.error)
              else {
                setCreated(r.data.token)
                setName("")
                setReadOnly(false)
                setScopeProjects([])
              }
            })
          }}
        >
          <div className="min-w-48 flex-1 space-y-1">
            <Label htmlFor="pat-name">Nama</Label>
            <Input
              id="pat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="GitLab CI"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pat-expiry">Kedaluwarsa</Label>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger id="pat-expiry" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY.map((e) => (
                  <SelectItem
                    key={String(e.days)}
                    value={String(e.days ?? "never")}
                  >
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pat-readonly">Hak</Label>
            <label
              className="flex h-9 items-center gap-2 text-sm"
              htmlFor="pat-readonly"
            >
              <Switch
                id="pat-readonly"
                checked={readOnly}
                onCheckedChange={setReadOnly}
              />
              Baca saja
            </label>
          </div>
          {projects.length > 0 && (
            <div className="w-full space-y-1">
              <Label>Batasi ke project (opsional)</Label>
              <div className="flex flex-wrap gap-2">
                {projects.map((p) => {
                  const on = scopeProjects.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setScopeProjects((cur) =>
                          on ? cur.filter((id) => id !== p.id) : [...cur, p.id]
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-xs ${
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {p.name}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Tanpa pilihan: token melihat semua project yang kamu lihat dan
                boleh memakai pengaturan platform. Dengan pilihan: hanya project
                itu, dan pengaturan platform (registry, server, proxy, swarm,
                notifikasi) ditolak.
              </p>
            </div>
          )}
          <Button type="submit" disabled={pending}>
            <Plus data-icon="inline-start" />
            {pending ? "Membuat…" : "Buat token"}
          </Button>
        </form>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>

      <Dialog
        open={created !== null}
        onOpenChange={(o) => !o && setCreated(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Token dibuat</DialogTitle>
            <DialogDescription>
              Salin sekarang — token tidak akan ditampilkan lagi. Hanya hash-nya
              yang disimpan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-xs">
              {created}
            </code>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Salin token"
              onClick={copy}
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
          <pre className="overflow-auto rounded bg-muted p-2 font-mono text-xs">
            {`curl -X POST ${publicApiUrl}/applications/<id>/deploy \\\n  -H "Authorization: Bearer ${created ?? ""}"`}
          </pre>
          <DialogFooter>
            <Button onClick={() => setCreated(null)}>Selesai</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
