"use client"

import { useEffect, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"
import { createLogTicketAction } from "./application.actions"
import {
  logsNamespaceUrl,
  type LogsClientEvents,
  type LogsServerEvents,
} from "./logs.protocol"

export type LogsSocket = Socket<LogsServerEvents, LogsClientEvents>

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
  const [reconnectKey, setReconnectKey] = useState(0)
  const socketRef = useRef<LogsSocket | null>(null)

  useEffect(() => {
    if (!enabled) return
    let disposed = false
    ;(async () => {
      const r = await createLogTicketAction(applicationId)
      if (disposed) return
      if (!r.ok) return setError(r.error)
      const s: LogsSocket = io(logsNamespaceUrl(publicApiUrl), {
        auth: { ticket: r.data.ticket },
        transports: ["websocket"],
        reconnection: false,
      })
      s.on("error", (m) => setError(m))
      s.on("connect_error", () => setError("Tidak dapat terhubung ke log"))
      socketRef.current = s
      setSocket(s)
    })()
    return () => {
      disposed = true
      socketRef.current?.disconnect()
      socketRef.current = null
      setSocket(null)
    }
  }, [applicationId, publicApiUrl, reconnectKey, enabled])

  return { socket, error, reconnect: () => setReconnectKey((k) => k + 1) }
}
