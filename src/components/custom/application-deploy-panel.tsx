"use client"

import {
  ExternalLink,
  Globe,
  History,
  Radio,
  RefreshCw,
  Rocket,
  Webhook,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { LogViewer } from "@/components/custom/log-viewer"
import { EmptyState } from "@/components/custom/empty-state"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  checkImageUpdateAction,
  rollbackApplicationAction,
} from "@/features/application/application.actions"
import {
  ACTIVE_DEPLOYMENT_STATUSES,
  type ApplicationDetail,
  type DeploymentStatus,
  type DeploymentStepTimes,
  type DeploymentSummary,
} from "@/features/application/application.entity"
import {
  formatDuration,
  totalDuration,
} from "@/features/application/deployment-steps"
import { useLogsSocket } from "@/features/application/use-logs-socket"
import { DEPLOYMENT_QUEUED_EVENT } from "./application-actions"
import { DeployStepper } from "./deploy-stepper"
import { useBrowserOrigin } from "./use-browser-host"

const STATUS_VARIANT: Record<
  DeploymentSummary["status"],
  "default" | "secondary" | "destructive"
> = {
  queued: "secondary",
  building: "secondary",
  pushing: "secondary",
  starting: "secondary",
  success: "default",
  failed: "destructive",
}

const isActive = (s: string) =>
  ACTIVE_DEPLOYMENT_STATUSES.includes(s as DeploymentStatus)

/** Short, human line naming who/what queued a deployment — used for both the
 * toast on `deployment:created` and the tooltip on a history row. */
function triggerLabel(d: {
  trigger: string
  commitSha: string | null
  commitMessage: string | null
  triggeredBy: string | null
}): string {
  const sha = d.commitSha ? d.commitSha.slice(0, 7) : null
  if (d.trigger === "webhook") {
    const parts = [
      sha,
      d.commitMessage,
      d.triggeredBy && `oleh ${d.triggeredBy}`,
    ]
      .filter(Boolean)
      .join(" · ")
    return `Webhook${parts ? ` — ${parts}` : ""}`
  }
  if (d.trigger === "auto-update") return "Update otomatis (image berubah)"
  return d.triggeredBy ? `Manual oleh ${d.triggeredBy}` : "Manual"
}

export function ApplicationDeployPanel({
  app,
  deployments,
  publicApiUrl,
  webOrigin,
  hasAccess = true,
  domainProxyAutoProvisioned = false,
  onNavigateTab,
}: {
  app: ApplicationDetail
  deployments: DeploymentSummary[]
  publicApiUrl: string
  /** The panel's configured `WEB_ORIGIN` — the only origin its Socket.IO gateways accept. */
  webOrigin: string
  /** Whether the app has a host port or at least one domain already. */
  hasAccess?: boolean
  /** The create dialog's "Domain" option had to auto-start the proxy. */
  domainProxyAutoProvisioned?: boolean
  /** Lets the post-deploy nudge jump to the Pengaturan/Domain tab. */
  onNavigateTab?: (tab: "settings" | "domains") => void
}) {
  const router = useRouter()
  const browserOrigin = useBrowserOrigin()
  // `null` until hydration — don't flash the warning before we know.
  const originMismatch = browserOrigin !== null && browserOrigin !== webOrigin
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [proxyWarningDismissed, setProxyWarningDismissed] = useState(false)
  const [imageNote, setImageNote] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(
    deployments[0]?.id ?? null
  )
  const [logText, setLogText] = useState("")
  const [liveStatus, setLiveStatus] = useState<string | null>(null)
  // Step start times announced by the socket, per deployment (first one wins);
  // `finished` is the terminal status' time. Merged over the row's own times.
  const [liveTimes, setLiveTimes] = useState<
    Record<string, DeploymentStepTimes & { finished?: string }>
  >({})
  const [containerLogs, setContainerLogs] = useState<string | null>(null)
  const [following, setFollowing] = useState(false)

  const {
    socket,
    error: socketError,
    reconnect,
  } = useLogsSocket(app.id, publicApiUrl, !originMismatch)

  const active = deployments.some((d) => isActive(d.status))
  // Read inside socket handlers without re-subscribing when it changes.
  const activeRef = useRef(active)
  useEffect(() => {
    activeRef.current = active
  }, [active])
  const selected = deployments.find((d) => d.id === selectedId) ?? null

  // Stream the selected deployment's log over the socket; refresh server
  // data once it reaches a terminal state.
  useEffect(() => {
    if (!socket || !selectedId || following) return
    const onLog = ({
      deploymentId,
      chunk,
      snapshot,
    }: {
      deploymentId: string
      chunk: string
      snapshot?: boolean
    }) => {
      if (deploymentId !== selectedId) return
      setLogText((t) => (snapshot ? chunk : t + chunk))
    }
    const onStatus = ({
      deploymentId,
      status,
      at,
    }: {
      deploymentId: string
      status: string
      at?: string
    }) => {
      if (deploymentId !== selectedId) return
      setLiveStatus(status)
      if (at) {
        const key =
          status === "success" || status === "failed"
            ? "finished"
            : status === "building" ||
                status === "pushing" ||
                status === "starting"
              ? status
              : null
        if (key) {
          setLiveTimes((all) => {
            const mine = all[deploymentId] ?? {}
            return mine[key]
              ? all
              : { ...all, [deploymentId]: { ...mine, [key]: at } }
          })
        }
      }
      if (!isActive(status) && activeRef.current) router.refresh()
    }
    socket.on("deployment:log", onLog)
    socket.on("deployment:status", onStatus)
    socket.emit("subscribe:deployment", selectedId)
    return () => {
      socket.off("deployment:log", onLog)
      socket.off("deployment:status", onStatus)
      socket.emit("unsubscribe")
    }
  }, [socket, selectedId, following, router])

  // A new deployment from anywhere (webhook, auto-update, another user's
  // manual deploy) — broadcast to every socket ticketed for this app, not
  // just one already subscribed to a specific deployment (see logs.gateway.ts).
  useEffect(() => {
    if (!socket) return
    const onCreated = (payload: {
      id: string
      trigger: string
      commitSha: string | null
      commitMessage: string | null
      triggeredBy: string | null
    }) => {
      toast.info(`Deploy dimulai — ${triggerLabel(payload)}`)
      setFollowing(false)
      setLogText("")
      setLiveStatus(null)
      setSelectedId(payload.id)
      router.refresh()
    }
    socket.on("deployment:created", onCreated)
    return () => {
      socket.off("deployment:created", onCreated)
    }
  }, [socket, router])

  // Follow container stdout/stderr live while toggled on.
  useEffect(() => {
    if (!socket || !following) return
    const onLog = (chunk: string) => setContainerLogs((t) => (t ?? "") + chunk)
    const onEnd = () => setFollowing(false)
    socket.on("container:log", onLog)
    socket.on("container:end", onEnd)
    socket.emit("subscribe:container", 200)
    return () => {
      socket.off("container:log", onLog)
      socket.off("container:end", onEnd)
      socket.emit("unsubscribe")
    }
  }, [socket, following])

  const selectDeployment = (id: string) => {
    setFollowing(false)
    setLogText("")
    setLiveStatus(null)
    setSelectedId(id)
  }

  // A deploy queued from the page's status strip: show its log like one started here.
  useEffect(() => {
    const onQueued = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id
      if (!id) return
      setFollowing(false)
      setLogText("")
      setLiveStatus(null)
      setSelectedId(id)
    }
    window.addEventListener(DEPLOYMENT_QUEUED_EVENT, onQueued)
    return () => window.removeEventListener(DEPLOYMENT_QUEUED_EVENT, onQueued)
  }, [])

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? "Gagal")
      else router.refresh()
    })

  const shownStatus = liveStatus ?? selected?.status ?? null
  const shownError = error ?? socketError

  return (
    <div className="space-y-4">
      {domainProxyAutoProvisioned && !proxyWarningDismissed && (
        <Alert variant="destructive">
          <AlertTitle>
            Reverse proxy belum aktif — sudah dinyalakan otomatis
          </AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Proxy (Traefik) belum jalan sebelum domain ini disimpan, jadi
              sudah diaktifkan otomatis. Domain baru bisa diakses kalau tiga hal
              ini juga sudah benar:
            </p>
            <ol className="ms-4 list-decimal space-y-1">
              <li>DNS domain sudah mengarah ke IP server ini.</li>
              <li>
                Port <code>80</code> dan <code>443</code> terbuka untuk publik
                (firewall OS maupun provider VPS).
              </li>
              <li>
                Sertifikat HTTPS (Let&apos;s Encrypt) baru diterbitkan saat
                domain pertama kali diakses — tunggu semenit.
              </li>
            </ol>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProxyWarningDismissed(true)}
            >
              Tutup
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!!app.currentImage && !hasAccess && (
        <Alert>
          <Globe />
          <AlertTitle>Aplikasi belum punya alamat akses</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Tanpa port host atau domain, aplikasi ini hanya bisa dijangkau di
              dalam network Docker.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab?.("settings")}
              >
                Atur port host
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab?.("domains")}
              >
                Tambah domain
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {app.service && (
        <div className="rounded-md border text-xs">
          <div className="flex items-center gap-2 border-b px-3 py-1.5">
            <span className="font-medium">Swarm service</span>
            <Badge
              variant={
                app.service.running >= app.service.desired
                  ? "secondary"
                  : "destructive"
              }
            >
              {app.service.running}/{app.service.desired} task
            </Badge>
            {app.service.updateState &&
              app.service.updateState !== "completed" && (
                <span className="text-muted-foreground">
                  update {app.service.updateState}
                  {app.service.updateMessage &&
                    ` · ${app.service.updateMessage}`}
                </span>
              )}
          </div>
          <ul className="divide-y">
            {app.service.tasks
              .filter((t) => t.desiredState === "running")
              .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
              .map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center gap-2 px-3 py-1.5"
                >
                  <span className="font-mono">#{t.slot ?? "?"}</span>
                  <span>{t.node ?? "?"}</span>
                  {!t.local && (
                    <span className="text-muted-foreground">(node lain)</span>
                  )}
                  <Badge
                    variant={t.state === "running" ? "secondary" : "outline"}
                  >
                    {t.state}
                  </Badge>
                  <span className="text-muted-foreground">
                    {new Date(t.since).toLocaleTimeString("id-ID")}
                  </span>
                  {t.error && (
                    <span className="text-destructive">{t.error}</span>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {app.sourceType === "image" && (
          <Button
            variant="outline"
            disabled={pending || active}
            onClick={() =>
              run(async () => {
                setImageNote(null)
                const r = await checkImageUpdateAction(app.id, true)
                if (r.ok) {
                  const d = r.data
                  setImageNote(
                    d.remoteDigest === null
                      ? "Referensi memakai digest tetap — tidak ada yang berubah."
                      : d.baseline
                        ? `Digest dicatat (${d.remoteDigest.slice(7, 19)}); belum ada pembanding.`
                        : d.changed
                          ? `Image berubah (${d.remoteDigest.slice(7, 19)}) — ${d.deploymentId ? "deploy dimulai." : "deployment lain sedang berjalan."}`
                          : `Sudah yang terbaru (${d.remoteDigest.slice(7, 19)}).`
                  )
                  if (d.deploymentId) selectDeployment(d.deploymentId)
                }
                return r
              })
            }
          >
            <RefreshCw data-icon="inline-start" />
            Cek update image
          </Button>
        )}
        <Button
          variant={following ? "secondary" : "ghost"}
          size="sm"
          disabled={!app.container || !socket}
          onClick={() => {
            setContainerLogs("")
            setFollowing((f) => !f)
          }}
        >
          <Radio data-icon="inline-start" />
          {following ? "Berhenti mengikuti log" : "Log container (live)"}
        </Button>
        {imageNote && !shownError && (
          <span className="text-xs text-muted-foreground">{imageNote}</span>
        )}
        {shownError && (
          <span
            className="flex items-center gap-2 text-xs text-destructive"
            role="alert"
          >
            {shownError}
            {socketError && (
              <Button variant="link" size="sm" onClick={reconnect}>
                sambung ulang
              </Button>
            )}
          </span>
        )}
      </div>

      {originMismatch && (
        <Alert variant="destructive">
          <AlertTitle>Log realtime tidak tersedia lewat alamat ini</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Panel ini punya domain kustom (<code>{webOrigin}</code>), dan log
              realtime hanya menerima koneksi dari domain itu — bukan dari{" "}
              <code>{browserOrigin}</code> yang sedang kamu pakai.
            </p>
            <Button size="sm" asChild>
              <a
                href={
                  webOrigin + window.location.pathname + window.location.search
                }
              >
                <ExternalLink data-icon="inline-start" />
                Buka halaman ini di {webOrigin}
              </a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {following && (
        <LogViewer
          text={containerLogs ?? ""}
          label="Log container"
          className="h-64"
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Deployment</h3>
          {deployments.length === 0 && (
            <EmptyState icon={Rocket} compact>
              Belum pernah deploy.
            </EmptyState>
          )}
          <ul className="divide-y rounded-md border">
            {deployments.map((d) => {
              const status =
                d.id === selectedId && liveStatus ? liveStatus : d.status
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => selectDeployment(d.id)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-muted/50 ${
                      d.id === selectedId ? "bg-muted/60" : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-mono">
                        {d.id.slice(0, 12)}
                        {d.kind === "rollback" && (
                          <span className="ms-1 text-muted-foreground">↺</span>
                        )}
                        {d.kind === "config" && (
                          <span
                            className="ms-1 text-muted-foreground"
                            title="Terapkan konfigurasi (tanpa build)"
                          >
                            ⚙
                          </span>
                        )}
                        {d.kind === "auto-update" && (
                          <span
                            className="ms-1 text-muted-foreground"
                            title="Update otomatis dari registry"
                          >
                            ⟳
                          </span>
                        )}
                        {d.trigger === "webhook" && (
                          <span
                            className="ms-1 inline-flex align-middle text-muted-foreground"
                            title={triggerLabel(d)}
                          >
                            <Webhook className="size-3" />
                          </span>
                        )}
                      </span>
                      <span
                        className="block truncate text-muted-foreground"
                        title={triggerLabel(d)}
                      >
                        {new Date(d.createdAt).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                        {d.commitSha && ` · ${d.commitSha.slice(0, 7)}`}
                        {totalDuration(d) !== null &&
                          ` · ${formatDuration(totalDuration(d)!)}`}
                      </span>
                    </span>
                    <Badge variant={STATUS_VARIANT[status as DeploymentStatus]}>
                      {status}
                    </Badge>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="min-w-0 truncate text-sm font-medium">
              Log deployment{" "}
              {selected && (
                <span className="font-normal text-muted-foreground">
                  ·{" "}
                  {selected.kind === "rollback"
                    ? "rollback"
                    : selected.kind === "auto-update"
                      ? "auto-update"
                      : selected.kind === "config"
                        ? "konfigurasi"
                        : "build"}{" "}
                  · {shownStatus}
                  {selected.imageRef && ` · ${selected.imageRef}`}
                  {" · "}
                  <span title={triggerLabel(selected)}>
                    {triggerLabel(selected)}
                  </span>
                </span>
              )}
            </h3>
            {selected?.status === "success" &&
              selected.imageRef &&
              selected.imageRef !== app.currentImage && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending || active}
                  onClick={() =>
                    run(async () => {
                      const r = await rollbackApplicationAction(
                        app.id,
                        selected.id
                      )
                      if (r.ok) selectDeployment(r.data.id)
                      return r
                    })
                  }
                >
                  <History data-icon="inline-start" />
                  Rollback ke sini
                </Button>
              )}
          </div>
          {selected && (
            <DeployStepper
              deployment={selected}
              sourceType={app.sourceType}
              remote={!!app.serverId}
              liveStatus={liveStatus}
              liveTimes={liveTimes[selected.id]}
            />
          )}
          <LogViewer
            key={selectedId ?? "none"}
            text={logText}
            label="Log deployment"
            empty={selectedId ? "Memuat…" : "Pilih deployment."}
          />
        </div>
      </div>
    </div>
  )
}
