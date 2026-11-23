"use client"

import {
  Globe,
  ArrowRight,
  History,
  Loader2,
  RefreshCw,
  Rocket,
  Sparkles,
  TriangleAlert,
  Webhook,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/custom/confirm-dialog"
import { LogViewer } from "@/components/custom/log-viewer"
import { IllustratedEmptyState } from "@/components/custom/illustrated-empty-state"
import { DeploymentsIllustration } from "@/components/custom/illustrations/deployments-illustration"
import { ActionAlert } from "@/components/custom/action-alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  checkImageUpdateAction,
  deployApplicationAction,
  fetchDeploymentAction,
  rollbackApplicationAction,
  switchImageTagAction,
} from "@/features/application/application.actions"
import {
  ACTIVE_DEPLOYMENT_STATUSES,
  type ApplicationDetail,
  type Deployment,
  type DeploymentStatus,
  type DeploymentStepTimes,
  type DeploymentSummary,
  type ImageCheckResult,
} from "@/features/application/application.entity"
import {
  formatDuration,
  totalDuration,
} from "@/features/application/deployment-steps"
import { useLogsSocket } from "@/features/application/use-logs-socket"
import { DEPLOYMENT_QUEUED_EVENT } from "./application-actions"
import { DeployStepper } from "./deploy-stepper"
import { RealtimeOriginAlert } from "./realtime-origin-alert"
import { useBrowserOrigin } from "./use-browser-host"
import { formatDateTime, formatRelative, formatTime } from "@/i18n/format"
import { useLocale, useTranslations } from "next-intl"
import { SectionHeader } from "@/components/custom/section-header"

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

/** HTTP poll interval for a running deployment while the socket is unavailable. */
const POLL_MS = 2_000
/** Consecutive failed reads after which polling a running deployment gives up. */
const MAX_POLL_FAILURES = 15

/** Short, human line naming who/what queued a deployment — used for both the
 * toast on `deployment:created` and the tooltip on a history row. */
function triggerLabel(
  d: {
    trigger: string
    commitSha: string | null
    commitMessage: string | null
    triggeredBy: string | null
  },
  t: (key: string, values?: Record<string, string>) => string
): string {
  const sha = d.commitSha ? d.commitSha.slice(0, 7) : null
  if (d.trigger === "webhook") {
    const parts = [
      sha,
      d.commitMessage,
      d.triggeredBy && t("deploy.trigger.by", { name: d.triggeredBy }),
    ]
      .filter(Boolean)
      .join(" · ")
    return parts
      ? t("deploy.trigger.webhookDetail", { detail: parts })
      : t("deploy.trigger.webhook")
  }
  if (d.trigger === "auto-update") {
    // Following version tags writes "to 0.1.1 (was 0.1.0)" as the message.
    const moved = d.commitMessage?.match(/^to (\S+) \(was (\S+)\)$/)
    return moved
      ? t("deploy.trigger.autoUpdateTag", { to: moved[1], from: moved[2] })
      : t("deploy.trigger.autoUpdate")
  }
  return d.triggeredBy
    ? t("deploy.trigger.manualBy", { name: d.triggeredBy })
    : t("deploy.trigger.manual")
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
  /** Lets the post-deploy nudge jump to the Settings/Domain tab. */
  onNavigateTab?: (tab: "settings" | "domains") => void
}) {
  const t = useTranslations("applications")
  const tc = useTranslations("common")
  const canEdit = app.projectRole !== "viewer"
  const locale = useLocale()
  const router = useRouter()
  const browserOrigin = useBrowserOrigin()
  // `null` until hydration — don't flash the warning before we know.
  const originMismatch = browserOrigin !== null && browserOrigin !== webOrigin
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [proxyWarningDismissed, setProxyWarningDismissed] = useState(false)
  const [imageNote, setImageNote] = useState<string | null>(null)
  // Last "Check image update" result: carries the newer-version hint. Looked up
  // only when the button is pressed, never on page load.
  const [imageCheck, setImageCheck] = useState<ImageCheckResult | null>(null)
  const [checking, setChecking] = useState(false)
  const [lastImageRef, setLastImageRef] = useState(app.imageRef)
  if (lastImageRef !== app.imageRef) {
    // The reference changed (switched here or in Settings): the hint is stale.
    setLastImageRef(app.imageRef)
    setImageCheck(null)
    setImageNote(null)
  }
  const [selectedId, setSelectedId] = useState<string | null>(
    deployments[0]?.id ?? null
  )
  const [logText, setLogText] = useState("")
  // The selected deployment's log arrived (socket snapshot or HTTP): an empty
  // log then reads "no output yet" instead of "Loading…".
  const [logLoaded, setLogLoaded] = useState(false)
  // Latest HTTP read of the selected deployment while the socket is unavailable.
  const [polled, setPolled] = useState<Deployment | null>(null)
  const [httpError, setHttpError] = useState<string | null>(null)
  const [liveStatus, setLiveStatus] = useState<string | null>(null)
  // Step start times announced by the socket, per deployment (first one wins);
  // `finished` is the terminal status' time. Merged over the row's own times.
  const [liveTimes, setLiveTimes] = useState<
    Record<string, DeploymentStepTimes & { finished?: string }>
  >({})

  const {
    socket,
    error: socketError,
    state: socketState,
    reconnect,
  } = useLogsSocket(app.id, publicApiUrl, !originMismatch)
  // No usable socket (other origin, rejected, failed or dropped): the log and
  // status come from `GET /deployments/:id` instead.
  const httpFallback = socketState === "unavailable"

  const active = deployments.some((d) => isActive(d.status))
  // Read inside socket handlers without re-subscribing when it changes.
  const activeRef = useRef(active)
  const deploymentsRef = useRef(deployments)
  useEffect(() => {
    activeRef.current = active
    deploymentsRef.current = deployments
  }, [active, deployments])
  const selected = deployments.find((d) => d.id === selectedId) ?? null
  // The HTTP read is fresher than the server-rendered row (and covers a
  // deployment queued a moment ago that the list does not show yet).
  const view: DeploymentSummary | null =
    httpFallback && polled && polled.id === selectedId ? polled : selected

  // Stream the selected deployment's log over the socket; refresh server
  // data once it reaches a terminal state.
  useEffect(() => {
    if (!socket || !selectedId) return
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
      setLogLoaded(true)
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
  }, [socket, selectedId, router])

  // Without a socket, read the selected deployment over HTTP: once for a
  // finished one, every POLL_MS while it runs, then refresh the page once.
  // The read replaces the text (never appends), and a late answer after the
  // socket came back is dropped, so nothing is duplicated.
  useEffect(() => {
    if (!httpFallback || !selectedId) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let sawActive = false
    let failures = 0
    const load = async () => {
      const r = await fetchDeploymentAction(selectedId)
      if (cancelled) return
      if (!r.ok) {
        setHttpError(r.error)
        // A running deployment keeps trying for a while (a dropped request is
        // not the end of it).
        const row = deploymentsRef.current.find((x) => x.id === selectedId)
        const running = sawActive || !row || isActive(row.status)
        if (running && ++failures < MAX_POLL_FAILURES)
          timer = setTimeout(() => void load(), POLL_MS)
        return
      }
      failures = 0
      const d = r.data
      setHttpError(null)
      setLogText(d.logs ?? "")
      setLogLoaded(true)
      setPolled(d)
      setLiveStatus(d.status)
      if (isActive(d.status)) {
        sawActive = true
        timer = setTimeout(() => void load(), POLL_MS)
      } else {
        const row = deploymentsRef.current.find((x) => x.id === d.id)
        // Finished while we watched, or the page still shows it running (or
        // not at all yet): refresh the history and header once.
        if (sawActive || !row || isActive(row.status)) router.refresh()
      }
    }
    void load()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [httpFallback, selectedId, router])

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
      toast.info(
        t("deploy.toast.started", { trigger: triggerLabel(payload, t) })
      )
      setLogText("")
      setLogLoaded(false)
      setPolled(null)
      setHttpError(null)
      setLiveStatus(null)
      setSelectedId(payload.id)
      router.refresh()
    }
    socket.on("deployment:created", onCreated)
    return () => {
      socket.off("deployment:created", onCreated)
    }
  }, [socket, router, t])

  function resetLog() {
    setLogText("")
    setLogLoaded(false)
    setPolled(null)
    setHttpError(null)
    setLiveStatus(null)
  }

  const selectDeployment = (id: string) => {
    resetLog()
    setSelectedId(id)
  }

  // A deploy queued from the page's status strip: show its log like one started here.
  useEffect(() => {
    const onQueued = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id
      if (!id) return
      setLogText("")
      setLogLoaded(false)
      setPolled(null)
      setHttpError(null)
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
      if (!r.ok) setError(r.error ?? t("deploy.failed"))
      else router.refresh()
    })

  // The newest deployment failed but the previous version still answers (the
  // app stays "running"): without this the failure is only visible in history.
  const latestFailedStillServing =
    deployments[0]?.status === "failed" &&
    app.status === "running" &&
    app.container?.state === "running"
  const shownStatus = liveStatus ?? view?.status ?? null
  const shownError = error ?? socketError ?? httpError
  // Rollback reuses the image of a successful deployment: say why the button
  // is missing when that image is the running one or was cleaned up.
  const rollbackNote =
    canEdit && view?.status === "success"
      ? !view.imageRef
        ? t("deploy.rollbackUnavailable.pruned")
        : view.imageRef === app.currentImage
          ? t("deploy.rollbackUnavailable.current")
          : null
      : null

  return (
    <div className="space-y-4">
      {domainProxyAutoProvisioned && !proxyWarningDismissed && (
        <ActionAlert
          variant="destructive"
          title={t("deploy.proxyWarning.title")}
          description={<p>{t("deploy.proxyWarning.intro")}</p>}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProxyWarningDismissed(true)}
            >
              {tc("actions.close")}
            </Button>
          }
        >
          <ol className="ms-4 list-decimal space-y-1 text-xs/relaxed text-destructive/90">
            <li>{t("deploy.proxyWarning.dns")}</li>
            <li>
              {t.rich("deploy.proxyWarning.ports", {
                code: (chunks) => <code>{chunks}</code>,
              })}
            </li>
            <li>{t("deploy.proxyWarning.cert")}</li>
          </ol>
        </ActionAlert>
      )}

      {!!app.currentImage && !hasAccess && (
        <ActionAlert
          icon={<Globe />}
          title={t("deploy.noAccess.title")}
          description={t("deploy.noAccess.body")}
          actions={
            canEdit ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateTab?.("settings")}
                >
                  {t("deploy.noAccess.setPort")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateTab?.("domains")}
                >
                  {t("deploy.noAccess.addDomain")}
                </Button>
              </>
            ) : undefined
          }
        />
      )}

      {latestFailedStillServing && (
        <ActionAlert
          variant="destructive"
          icon={<TriangleAlert />}
          title={t("deploy.lastFailed.title")}
          description={
            deployments[0].errorMessage ? (
              <span className="line-clamp-3 block font-mono text-xs break-words">
                {deployments[0].errorMessage}
              </span>
            ) : undefined
          }
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectDeployment(deployments[0].id)}
            >
              {t("deploy.lastFailed.viewLog")}
            </Button>
          }
        />
      )}

      {app.service && (
        <div className="rounded-md border text-xs">
          <div className="flex items-center gap-2 border-b px-3 py-1.5">
            <span className="font-medium">{t("deploy.swarm.title")}</span>
            <Badge
              variant={
                app.service.running >= app.service.desired
                  ? "secondary"
                  : "destructive"
              }
            >
              {t("deploy.swarm.tasks", {
                running: app.service.running,
                desired: app.service.desired,
              })}
            </Badge>
            {app.service.updateState &&
              app.service.updateState !== "completed" && (
                <span className="text-muted-foreground">
                  {t("deploy.swarm.update", { state: app.service.updateState })}
                  {app.service.updateMessage &&
                    ` · ${app.service.updateMessage}`}
                </span>
              )}
          </div>
          <ul className="divide-y">
            {app.service.tasks
              .filter((task) => task.desiredState === "running")
              .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
              .map((task) => (
                <li
                  key={task.id}
                  className="flex flex-wrap items-center gap-2 px-3 py-1.5"
                >
                  <span className="font-mono">#{task.slot ?? "?"}</span>
                  <span>{task.node ?? "?"}</span>
                  {!task.local && (
                    <span className="text-muted-foreground">
                      {t("deploy.swarm.otherNode")}
                    </span>
                  )}
                  <Badge
                    variant={task.state === "running" ? "secondary" : "outline"}
                  >
                    {task.state}
                  </Badge>
                  <span className="text-muted-foreground">
                    {formatTime(task.since, locale)}
                  </span>
                  {task.error && (
                    <span className="text-destructive">{task.error}</span>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
      <SectionHeader
        title={t("deploy.section.title")}
        description={t("deploy.section.description", {
          count: deployments.length,
        })}
        action={
          canEdit && app.sourceType === "image" ? (
            <div className="flex items-center gap-3">
              {app.imageCheckedAt && (
                <span
                  className="hidden text-xs text-muted-foreground sm:inline"
                  suppressHydrationWarning
                >
                  {t("deploy.image.lastChecked", {
                    time: formatRelative(app.imageCheckedAt, locale),
                  })}
                </span>
              )}
              <Button
                variant="secondary"
                className="border border-border"
                disabled={pending || active}
                onClick={() => {
                  // Set outside the transition: state set inside an async
                  // transition only commits when the action ends.
                  setChecking(true)
                  run(async () => {
                    setImageNote(null)
                    setImageCheck(null)
                    let r: Awaited<ReturnType<typeof checkImageUpdateAction>>
                    try {
                      r = await checkImageUpdateAction(app.id, true)
                    } finally {
                      setChecking(false)
                    }
                    if (r.ok) {
                      const d = r.data
                      const values = {
                        tag: d.tag,
                        digest: d.remoteDigest?.slice(7, 19) ?? "",
                      }
                      const note =
                        d.remoteDigest === null
                          ? t("deploy.image.pinned")
                          : d.baseline
                            ? t("deploy.image.baseline", values)
                            : d.changed
                              ? t(
                                  d.deploymentId
                                    ? "deploy.image.changedStarted"
                                    : "deploy.image.changedBusy",
                                  values
                                )
                              : t("deploy.image.upToDate", values)
                      setImageNote(
                        d.tagError
                          ? `${note} ${t("deploy.image.tagError", { error: d.tagError })}`
                          : note
                      )
                      setImageCheck(d)
                      if (d.deploymentId) selectDeployment(d.deploymentId)
                    }
                    return r
                  })
                }}
              >
                {checking ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <RefreshCw data-icon="inline-start" />
                )}
                {checking
                  ? t("deploy.image.checking")
                  : t("deploy.image.check")}
              </Button>
            </div>
          ) : undefined
        }
      />
      {(shownError || imageNote) && (
        <div className="flex flex-wrap items-center gap-2">
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
                  {t("deploy.reconnect")}
                </Button>
              )}
            </span>
          )}
        </div>
      )}

      {canEdit && imageCheck?.newerTag && imageCheck.newerImageRef && (
        <ActionAlert
          variant="highlight"
          icon={<Sparkles />}
          title={t.rich("deploy.image.newer.title", {
            tag: imageCheck.newerTag,
            code: (chunks) => <code className="font-mono">{chunks}</code>,
          })}
          description={t("deploy.image.newer.body")}
          actions={
            <ConfirmDialog
              tone="neutral"
              trigger={
                <Button disabled={pending || active}>
                  <Rocket data-icon="inline-start" />
                  {t("deploy.image.newer.switch")}
                </Button>
              }
              title={t("deploy.image.newer.confirmTitle", {
                tag: imageCheck.newerTag,
              })}
              description={t("deploy.image.newer.confirmBody", {
                ref: imageCheck.newerImageRef,
                current: imageCheck.tag,
              })}
              confirmLabel={t("deploy.image.newer.switch")}
              onConfirm={async () => {
                const r = await switchImageTagAction(
                  app.id,
                  imageCheck.newerImageRef as string
                )
                if (r.ok) {
                  selectDeployment(r.data.id)
                  router.refresh()
                }
                return r
              }}
            />
          }
        >
          <p className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="rounded border bg-background/60 px-1.5 py-0.5 font-mono">
              {imageCheck.tag}
            </span>
            <ArrowRight className="size-3 text-muted-foreground" aria-hidden />
            <span className="rounded border border-primary/50 bg-background/60 px-1.5 py-0.5 font-mono font-medium">
              {imageCheck.newerTag}
            </span>
          </p>
        </ActionAlert>
      )}

      {originMismatch && (
        <RealtimeOriginAlert
          webOrigin={webOrigin}
          browserOrigin={browserOrigin ?? ""}
        />
      )}

      {deployments.length === 0 ? (
        <IllustratedEmptyState
          illustration={<DeploymentsIllustration />}
          title={t("deploy.history.emptyTitle")}
          description={t("deploy.history.emptyBody")}
          actions={
            canEdit ? (
              <Button
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    const r = await deployApplicationAction(app.id)
                    if (r.ok)
                      window.dispatchEvent(
                        new CustomEvent(DEPLOYMENT_QUEUED_EVENT, {
                          detail: { id: r.data.id },
                        })
                      )
                    return r
                  })
                }
              >
                <Rocket data-icon="inline-start" />
                {t("deploy.history.deployNow")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
          <div className="space-y-1">
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
                            <span className="ms-1 text-muted-foreground">
                              ↺
                            </span>
                          )}
                          {d.kind === "config" && (
                            <span
                              className="ms-1 text-muted-foreground"
                              title={t("deploy.kind.configTitle")}
                            >
                              ⚙
                            </span>
                          )}
                          {d.kind === "auto-update" && (
                            <span
                              className="ms-1 text-muted-foreground"
                              title={t("deploy.kind.autoUpdateTitle")}
                            >
                              ⟳
                            </span>
                          )}
                          {d.trigger === "webhook" && (
                            <span
                              className="ms-1 inline-flex align-middle text-muted-foreground"
                              title={triggerLabel(d, t)}
                            >
                              <Webhook className="size-3" />
                            </span>
                          )}
                        </span>
                        <span
                          className="block truncate text-muted-foreground"
                          title={triggerLabel(d, t)}
                        >
                          {formatDateTime(d.createdAt, locale, {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                          {d.commitSha && ` · ${d.commitSha.slice(0, 7)}`}
                          {totalDuration(d) !== null &&
                            ` · ${formatDuration(totalDuration(d)!, locale, t)}`}
                        </span>
                      </span>
                      <Badge
                        variant={STATUS_VARIANT[status as DeploymentStatus]}
                      >
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
                {t("deploy.log.title")}{" "}
                {view && (
                  <span className="font-normal text-muted-foreground">
                    · {t(`deploy.kind.${view.kind}`)} · {shownStatus}
                    {view.imageRef && ` · ${view.imageRef}`}
                    {" · "}
                    <span title={triggerLabel(view, t)}>
                      {triggerLabel(view, t)}
                    </span>
                  </span>
                )}
              </h3>
              {canEdit &&
                view?.status === "success" &&
                view.imageRef &&
                view.imageRef !== app.currentImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending || active}
                    onClick={() =>
                      run(async () => {
                        const r = await rollbackApplicationAction(
                          app.id,
                          view.id
                        )
                        if (r.ok) selectDeployment(r.data.id)
                        return r
                      })
                    }
                  >
                    <History data-icon="inline-start" />
                    {t("deploy.rollbackHere")}
                  </Button>
                )}
            </div>
            {rollbackNote && (
              <p className="text-xs text-muted-foreground">{rollbackNote}</p>
            )}
            {view && (
              <DeployStepper
                deployment={view}
                sourceType={app.sourceType}
                remote={!!app.serverId}
                liveStatus={liveStatus}
                liveTimes={liveTimes[view.id]}
              />
            )}
            {httpFallback && view && isActive(shownStatus ?? view.status) && (
              <p className="text-xs text-muted-foreground">
                {t("deploy.log.polling")}
              </p>
            )}
            <LogViewer
              key={selectedId ?? "none"}
              text={logText}
              label={t("deploy.log.label")}
              empty={
                !selectedId
                  ? t("deploy.log.select")
                  : logLoaded
                    ? t("deploy.log.empty")
                    : httpError
                      ? t("deploy.log.unavailable")
                      : tc("states.loading")
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}
