"use client"

import { Copy, Network, Trash2 } from "lucide-react"
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
  initSwarmAction,
  leaveSwarmAction,
  removeNodeAction,
  updateNodeAction,
} from "@/features/swarm/swarm.actions"
import type { SwarmNode, SwarmStatus } from "@/features/swarm/swarm.entity"

function gb(n: number) {
  return `${(n / 1024 ** 3).toFixed(1)} GB`
}

/**
 * Docker Swarm on the host: init, node list with drain/activate/remove,
 * join commands (owner) and leave. Apps opt in per application
 * ("Mode deploy: service"); everything else stays plain containers.
 */
export function SwarmCard({
  status,
  isOwner,
}: {
  status: SwarmStatus
  isOwner: boolean
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [advertise, setAdvertise] = useState("")
  const [copied, setCopied] = useState<string | null>(null)

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? "Gagal")
    })

  const joinCmd = (token: string) =>
    `docker swarm join --token ${token} ${status.nodeAddr ?? "<ip-manager>"}:2377`

  const copy = (label: string, text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Docker Swarm</CardTitle>
            <CardDescription>
              Menjalankan aplikasi sebagai <em>service</em> (replika, rolling
              update oleh daemon) — dipilih per aplikasi lewat{" "}
              <em>Mode deploy</em>. Database, stack compose, dan preview tetap
              container biasa.
            </CardDescription>
          </div>
          {status.state === "active" ? (
            <Badge>{status.isManager ? "Manager" : "Worker"}</Badge>
          ) : status.state === "inactive" ? (
            <Badge variant="secondary">Nonaktif</Badge>
          ) : (
            <Badge variant="destructive">{status.state}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {status.error && <p className="text-destructive">{status.error}</p>}

        {status.state !== "active" && isOwner && (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              run(() => initSwarmAction(advertise))
            }}
          >
            <div className="min-w-48 flex-1 space-y-1">
              <Label htmlFor="swarm-adv">Advertise address (opsional)</Label>
              <Input
                id="swarm-adv"
                value={advertise}
                onChange={(e) => setAdvertise(e.target.value)}
                placeholder="IP publik/privat host, untuk node lain"
                className="h-8"
              />
            </div>
            <Button type="submit" size="sm" disabled={pending}>
              <Network data-icon="inline-start" />
              {status.state === "error" ? "Init ulang swarm" : "Init swarm"}
            </Button>
          </form>
        )}

        {status.isManager && (
          <>
            <ul className="divide-y rounded-md border">
              {status.nodes.map((n) => (
                <li key={n.id} className="flex items-center gap-2 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{n.hostname}</span>
                      <Badge variant="outline">{n.role}</Badge>
                      {n.leader && <Badge variant="outline">leader</Badge>}
                      <Badge
                        variant={
                          n.state === "ready" && n.availability === "active"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {n.state}
                        {n.availability !== "active" && ` · ${n.availability}`}
                      </Badge>
                    </div>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {n.addr} · {n.cpus} CPU · {gb(n.memoryBytes)} · engine{" "}
                      {n.engineVersion}
                      {n.message && ` · ${n.message}`}
                    </p>
                    {isOwner ? (
                      <NodeLabels
                        node={n}
                        disabled={pending}
                        onSave={(labels) =>
                          run(() => updateNodeAction(n.id, { labels }))
                        }
                      />
                    ) : (
                      Object.keys(n.labels).length > 0 && (
                        <p className="font-mono text-xs text-muted-foreground">
                          {Object.entries(n.labels)
                            .map(([k, v]) => `${k}=${v}`)
                            .join(" ")}
                        </p>
                      )
                    )}
                  </div>
                  {isOwner && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          run(() =>
                            updateNodeAction(n.id, {
                              availability:
                                n.availability === "active"
                                  ? "drain"
                                  : "active",
                            })
                          )
                        }
                      >
                        {n.availability === "active" ? "Drain" : "Aktifkan"}
                      </Button>
                      {n.id !== status.nodeId && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Hapus node"
                          disabled={pending}
                          onClick={() =>
                            run(() =>
                              removeNodeAction(n.id, n.state !== "down")
                            )
                          }
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>

            {status.joinTokens && (
              <div className="space-y-1">
                <p className="text-muted-foreground">
                  Tambah node: jalankan di server lain (Docker terpasang). Node
                  tambahan belum bisa menjalankan app aoox (registry &
                  volume masih lokal) — tahap berikutnya.
                </p>
                {(["worker", "manager"] as const).map((kind) => (
                  <div key={kind} className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                      {joinCmd(status.joinTokens![kind])}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copy(kind, joinCmd(status.joinTokens![kind]))
                      }
                    >
                      <Copy data-icon="inline-start" />
                      {copied === kind ? "Tersalin" : kind}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {status.nodes.length > 1 && !status.registry.reachableFromNodes && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">
                Registry lokal beralamat{" "}
                <code>{status.registry.url ?? "?"}</code> — node lain tidak bisa
                menarik image hasil build. Set <code>REGISTRY_PUBLIC_HOST</code>{" "}
                ke alamat host yang dijangkau semua node (dan{" "}
                <code>insecure-registries</code> atau TLS di tiap daemon), lalu
                provision ulang registry. Image publik (Docker Hub, GHCR) tidak
                terpengaruh.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-muted-foreground">
                {status.serviceApps} aplikasi berjalan sebagai service.
              </span>
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending || status.serviceApps > 0}
                  title={
                    status.serviceApps > 0
                      ? "Kembalikan aplikasi ke mode container dulu"
                      : undefined
                  }
                  onClick={() => {
                    if (!confirm("Keluar dari swarm? Service akan hilang."))
                      return
                    run(leaveSwarmAction)
                  }}
                >
                  Keluar dari swarm
                </Button>
              )}
            </div>
          </>
        )}

        {error && (
          <p className="text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/** `key=value` list edited inline; saved as the node's whole label set. */
function NodeLabels({
  node,
  disabled,
  onSave,
}: {
  node: SwarmNode
  disabled: boolean
  onSave: (labels: Record<string, string>) => void
}) {
  const initial = Object.entries(node.labels)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ")
  const [text, setText] = useState(initial)
  const dirty = text.trim() !== initial
  return (
    <form
      className="mt-1 flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault()
        const labels: Record<string, string> = {}
        for (const pair of text.split(/[\s,]+/).filter(Boolean)) {
          const [k, ...rest] = pair.split("=")
          if (k) labels[k] = rest.join("=")
        }
        onSave(labels)
      }}
    >
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="label: zone=eu tier=db"
        className="h-7 font-mono text-xs"
        aria-label={`Label node ${node.hostname}`}
      />
      {dirty && (
        <Button type="submit" size="sm" variant="outline" disabled={disabled}>
          Simpan
        </Button>
      )}
    </form>
  )
}
