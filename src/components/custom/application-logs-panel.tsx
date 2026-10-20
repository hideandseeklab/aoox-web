"use client"

import { RotateCw, ServerOff, TriangleAlert, Unplug } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { LogViewer } from "@/components/custom/log-viewer"
import { RealtimeOriginAlert } from "@/components/custom/realtime-origin-alert"
import { SectionHeader } from "@/components/custom/section-header"
import { StatusDot, type StatusTone } from "@/components/custom/status-dot"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ApplicationDetail } from "@/features/application/application.entity"
import { useLogsSocket } from "@/features/application/use-logs-socket"
import { useBrowserOrigin } from "./use-browser-host"

/** Initial lines the API sends before following; it clamps `tail` to 1..5000. */
const TAIL_OPTIONS = [100, 200, 500, 1000] as const
const DEFAULT_TAIL = 200
/** Only the tail of a long session is kept in memory (the viewer parses at most this much too). */
const MAX_CHARS = 2_000_000

type StreamStatus =
  "connecting" | "live" | "ended" | "noContainer" | "disconnected" | "error"

const TONE: Record<StreamStatus, StatusTone> = {
  connecting: "transition",
  live: "active",
  ended: "idle",
  noContainer: "idle",
  disconnected: "error",
  error: "error",
}

/**
 * The Logs tab: the application's container output, live over the `/logs`
 * socket (`subscribe:container(tail)`; service mode streams every task in
 * one feed). The tab content is unmounted when another tab is picked, so the
 * socket (and the daemon's log stream behind it) only exists while it shows.
 * Pausing is the viewer's Follow toggle: lines keep arriving, it only stops
 * scrolling to the newest one.
 */
export function ApplicationLogsPanel({
  app,
  publicApiUrl,
  webOrigin,
}: {
  app: ApplicationDetail
  publicApiUrl: string
  /** The panel's `WEB_ORIGIN`, the only origin the `/logs` gateway accepts. */
  webOrigin: string
}) {
  const t = useTranslations("applications")
  const router = useRouter()
  const browserOrigin = useBrowserOrigin()
  // `null` until hydration: don't flash the warning before we know.
  const originMismatch = browserOrigin !== null && browserOrigin !== webOrigin
  const {
    socket,
    error: socketError,
    reconnect,
  } = useLogsSocket(app.id, publicApiUrl, !originMismatch)

  const [tail, setTail] = useState<number>(DEFAULT_TAIL)
  // Bumped to subscribe again on the same socket (after the stream ended).
  const [subscription, setSubscription] = useState(0)
  const [text, setText] = useState("")
  const [stream, setStream] = useState<{
    status: StreamStatus
    message?: string
  }>({ status: "connecting" })

  useEffect(() => {
    if (!socket) return
    const onConnect = () =>
      setStream((s) => (s.status === "connecting" ? { status: "live" } : s))
    const onLog = (chunk: string) => {
      setText((prev) => {
        const next = prev + chunk
        return next.length > MAX_CHARS ? next.slice(-MAX_CHARS) : next
      })
      onConnect()
    }
    let refresh: ReturnType<typeof setTimeout> | undefined
    const onEnd = () => {
      // An error sent just before the end says more than "ended".
      setStream((s) => (s.status === "error" ? s : { status: "ended" }))
      // The container stopped or was replaced: refresh the header status once
      // the API has written it (a stop updates the row after the container).
      clearTimeout(refresh)
      refresh = setTimeout(() => router.refresh(), 1500)
    }
    const onError = (message: string) =>
      setStream(
        message === "no container"
          ? { status: "noContainer" }
          : { status: "error", message }
      )
    const onDisconnect = (reason: string) => {
      if (reason === "io client disconnect") return
      setStream({ status: "disconnected" })
    }
    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    socket.on("container:log", onLog)
    socket.on("container:end", onEnd)
    socket.on("error", onError)
    // Emits are buffered until the socket is connected.
    socket.emit("subscribe:container", tail)
    if (socket.connected) void Promise.resolve().then(onConnect)
    return () => {
      clearTimeout(refresh)
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.off("container:log", onLog)
      socket.off("container:end", onEnd)
      socket.off("error", onError)
      if (socket.connected) socket.emit("unsubscribe")
    }
  }, [socket, tail, subscription, router])

  const restart = (nextTail = tail) => {
    setText("")
    setStream({ status: "connecting" })
    // The container may have been started or replaced meanwhile: refresh the header too.
    router.refresh()
    if (nextTail !== tail) {
      setTail(nextTail)
      if (socket?.connected) return
    }
    if (socket?.connected && !socketError) setSubscription((n) => n + 1)
    else reconnect()
  }

  // A failed ticket or connection has no socket events to report it.
  const shown: { status: StreamStatus; message?: string } =
    stream.status === "connecting" && socketError
      ? { status: "error", message: socketError }
      : stream
  const status = originMismatch ? "disconnected" : shown.status
  // A stopped container still answers with its last lines, then the stream
  // ends: name that "not running" rather than a plain end of stream.
  const stopped =
    status === "ended" && !!app.container && app.container.state !== "running"

  return (
    <div className="space-y-4">
      {originMismatch && (
        <RealtimeOriginAlert
          webOrigin={webOrigin}
          browserOrigin={browserOrigin ?? ""}
        />
      )}
      <SectionHeader
        title={t("logs.title")}
        description={
          app.deployMode === "service"
            ? t("logs.descriptionService")
            : t("logs.description")
        }
        action={
          <>
            <StatusDot
              status={status}
              tone={TONE[status]}
              label={t(`logs.status.${stopped ? "stopped" : status}`)}
              showLabel
              className="me-1"
            />
            <Select
              value={String(tail)}
              onValueChange={(v) => restart(Number(v))}
              disabled={originMismatch}
            >
              <SelectTrigger aria-label={t("logs.tailLabel")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {TAIL_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {t("logs.tailOption", { count: n })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              disabled={originMismatch}
              onClick={() => restart()}
            >
              <RotateCw data-icon="inline-start" />
              {t("logs.reconnect")}
            </Button>
          </>
        }
      />

      {!originMismatch && shown.status === "noContainer" && (
        <Alert>
          <ServerOff />
          <AlertTitle>{t("logs.noContainer.title")}</AlertTitle>
          <AlertDescription>{t("logs.noContainer.body")}</AlertDescription>
        </Alert>
      )}
      {!originMismatch && shown.status === "ended" && (
        <Alert>
          <ServerOff />
          <AlertTitle>
            {stopped ? t("logs.noContainer.title") : t("logs.ended.title")}
          </AlertTitle>
          <AlertDescription>
            {stopped ? t("logs.noContainer.stoppedBody") : t("logs.ended.body")}
          </AlertDescription>
        </Alert>
      )}
      {!originMismatch && shown.status === "disconnected" && (
        <Alert variant="destructive">
          <Unplug />
          <AlertTitle>{t("logs.disconnected.title")}</AlertTitle>
          <AlertDescription>{t("logs.disconnected.body")}</AlertDescription>
        </Alert>
      )}
      {!originMismatch && shown.status === "error" && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>{t("logs.error.title")}</AlertTitle>
          {shown.message && (
            <AlertDescription className="break-words">
              {shown.message}
            </AlertDescription>
          )}
        </Alert>
      )}

      <LogViewer
        text={text}
        label={t("logs.title")}
        empty={
          shown.status === "noContainer"
            ? t("logs.emptyNoContainer")
            : undefined
        }
        downloadName={`${app.appName}-logs.txt`}
        className="h-[32rem] max-h-[70vh]"
      />
    </div>
  )
}
