"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { io, type Socket } from "socket.io-client"
import { createLogTicketAction } from "./application.actions"
import {
  logsNamespaceUrl,
  type LogsClientEvents,
  type LogsServerEvents,
} from "./logs.protocol"

export type LogsSocket = Socket<LogsServerEvents, LogsClientEvents>

/**
 * `connecting` until the socket is up (or for at most `STALL_MS`),
 * `connected` while the gateway accepts it, `unavailable` when there is no
 * usable socket: disabled (wrong origin), the ticket failed, the connection
 * failed, the gateway rejected it (it connects, sends `error`, then
 * disconnects) or the connection dropped. Callers load over HTTP instead
 * while it is not `connected`.
 */
export type LogsSocketState = "connecting" | "connected" | "unavailable"

/** How long "connecting" may last before callers treat the socket as unavailable. */
const STALL_MS = 3_000

/**
 * One socket to the API's /logs namespace for an application. Reconnects
 * with a fresh ticket when `reconnectKey` changes. `enabled: false` skips
 * creating a ticket/socket entirely — for a page opened from an origin the
 * gateway will reject anyway (see terminal-view.tsx's origin check), so
 * there's no point spending a ticket on a connection that can't succeed.
 */
export function useLogsSocket(
  applicationId: string,
  publicApiUrl: string,
  enabled = true
) {
  const [socket, setSocket] = useState<LogsSocket | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<LogsSocketState>("connecting")
  const [reconnectKey, setReconnectKey] = useState(0)
  const socketRef = useRef<LogsSocket | null>(null)
  const t = useTranslations("applications")
  const connectFailed = t("logs.connectFailed")

  useEffect(() => {
    if (!enabled) return
    let disposed = false
    // A socket that never comes up must not keep callers waiting.
    const stall = setTimeout(() => {
      if (!disposed) setState((s) => (s === "connecting" ? "unavailable" : s))
    }, STALL_MS)
    ;(async () => {
      const r = await createLogTicketAction(applicationId)
      if (disposed) return
      if (!r.ok) {
        setState("unavailable")
        return setError(r.error)
      }
      // A reconnect starts clean: an error from the previous socket is stale.
      setError(null)
      const s: LogsSocket = io(logsNamespaceUrl(publicApiUrl), {
        auth: { ticket: r.data.ticket },
        transports: ["websocket"],
        reconnection: false,
      })
      s.on("connect", () => setState("connected"))
      s.on("disconnect", (reason) => {
        if (reason !== "io client disconnect") setState("unavailable")
      })
      s.on("error", (m) => setError(m))
      s.on("connect_error", () => {
        setError(connectFailed)
        setState("unavailable")
      })
      socketRef.current = s
      setSocket(s)
    })()
    return () => {
      disposed = true
      clearTimeout(stall)
      socketRef.current?.disconnect()
      socketRef.current = null
      setSocket(null)
      setState("connecting")
    }
  }, [applicationId, publicApiUrl, reconnectKey, enabled, connectFailed])

  return {
    socket,
    error,
    state: enabled ? state : ("unavailable" as const),
    reconnect: () => setReconnectKey((k) => k + 1),
  }
}
