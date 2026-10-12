"use client"

import { Copy, Network, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
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
import { copyToClipboard } from "@/lib/clipboard"

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
  const t = useTranslations("infra.swarm")
  const code = (c: React.ReactNode) => <code>{c}</code>
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [advertise, setAdvertise] = useState("")
  const [copied, setCopied] = useState<string | null>(null)

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? t("failed"))
    })

  const joinCmd = (token: string) =>
    `docker swarm join --token ${token} ${status.nodeAddr ?? "<ip-manager>"}:2377`

  const copy = (label: string, text: string) => {
    void copyToClipboard(text).then((ok) => {
      if (ok) {
        setCopied(label)
        setTimeout(() => setCopied(null), 1500)
        toast.success(t("copied", { label }))
      } else {
        toast.error(t("copyFailed", { label }))
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Docker Swarm</CardTitle>
            <CardDescription>
              {t.rich("description", { em: (c) => <em>{c}</em> })}
            </CardDescription>
          </div>
          {status.state === "active" ? (
            <Badge>{status.isManager ? t("manager") : t("worker")}</Badge>
          ) : status.state === "inactive" ? (
            <Badge variant="secondary">{t("inactive")}</Badge>
          ) : (
            <Badge variant="destructive">{status.state}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 text-xs">
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
              <Label htmlFor="swarm-adv">{t("advertise")}</Label>
              <Input
                id="swarm-adv"
                value={advertise}
                onChange={(e) => setAdvertise(e.target.value)}
                placeholder={t("advertisePlaceholder")}
              />
            </div>
            <Button type="submit" disabled={pending}>
              <Network data-icon="inline-start" />
              {status.state === "error" ? t("reinit") : t("init")}
            </Button>
          </form>
        )}

        {status.isManager && (
          <>
            <section className="space-y-2">
              <h3 className="text-xs font-medium">
                {t("nodesTitle")} ({status.nodes.length})
              </h3>
              <ul className="divide-y rounded-md border">
                {status.nodes.map((n) => (
                  <li key={n.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{n.hostname}</span>
                        <Badge variant="outline">{n.role}</Badge>
                        {n.leader && (
                          <Badge variant="outline">{t("leader")}</Badge>
                        )}
                        <Badge
                          variant={
                            n.state === "ready" && n.availability === "active"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {n.state}
                          {n.availability !== "active" &&
                            ` · ${n.availability}`}
                        </Badge>
                      </div>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {n.addr} · {n.cpus} CPU · {gb(n.memoryBytes)} ·{" "}
                        {t("engine", { version: n.engineVersion })}
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
                          {n.availability === "active"
                            ? t("drain")
                            : t("activate")}
                        </Button>
                        {n.id !== status.nodeId && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("removeNode")}
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
            </section>

            {status.joinTokens && (
              <section className="space-y-2">
                <h3 className="text-xs font-medium">{t("joinTitle")}</h3>
                <p className="text-muted-foreground">{t("addNode")}</p>
                <div className="space-y-2 pt-1">
                  {(["worker", "manager"] as const).map((kind) => (
                    <div key={kind} className="flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-1.5 text-xs">
                        {joinCmd(status.joinTokens![kind])}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-24 justify-center"
                        onClick={() =>
                          copy(kind, joinCmd(status.joinTokens![kind]))
                        }
                      >
                        <Copy data-icon="inline-start" />
                        {copied === kind ? t("copiedShort") : t(kind)}
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {status.nodes.length > 1 && !status.registry.reachableFromNodes && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">
                {t.rich("registryWarning", {
                  url: status.registry.url ?? "?",
                  code,
                })}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <span className="text-muted-foreground">
                {t("serviceApps", { count: status.serviceApps })}
              </span>
              {isOwner && (
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending || status.serviceApps > 0}
                      title={
                        status.serviceApps > 0 ? t("leaveBlocked") : undefined
                      }
                    >
                      {t("leave")}
                    </Button>
                  }
                  title={t("leaveTitle")}
                  description={t("leaveDescription")}
                  confirmLabel={t("leave")}
                  onConfirm={leaveSwarmAction}
                />
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
  const t = useTranslations("infra.swarm")
  const initial = Object.entries(node.labels)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ")
  const [text, setText] = useState(initial)
  const dirty = text.trim() !== initial
  return (
    <form
      className="flex items-center gap-2 pt-1"
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
        placeholder={t("labelsPlaceholder")}
        className="font-mono text-xs"
        aria-label={t("labelsAria", { hostname: node.hostname })}
      />
      {dirty && (
        <Button type="submit" variant="outline" disabled={disabled}>
          {t("save")}
        </Button>
      )}
    </form>
  )
}
