"use client"

import "@xterm/xterm/css/xterm.css"

import { RotateCw } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Server } from "@/features/server/server.entity"
import { createTerminalTicket } from "@/features/terminal/terminal.actions"
import {
  terminalNamespaceUrl,
  type TerminalClientEvents,
  type TerminalHandshakeAuth,
  type TerminalServerEvents,
} from "@/features/terminal/terminal.protocol"

type TerminalSocket = Socket<TerminalServerEvents, TerminalClientEvents>

type Status = "connecting" | "connected" | "closed" | "error"

const STATUS_LABEL: Record<Status, string> = {
  connecting: "Menghubungkan…",
  connected: "Terhubung",
  closed: "Terputus",
  error: "Gagal",
}

/** Sentinel for the aoox host itself (no serverId in the ticket). */
const LOCAL_TARGET = "local"

export function TerminalView({
  publicApiUrl,
  servers,
}: {
  publicApiUrl: string
  servers: Server[]
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>("connecting")
  const [attempt, setAttempt] = useState(0)
  const [target, setTarget] = useState(LOCAL_TARGET)
  const serverId = target === LOCAL_TARGET ? undefined : target

  const reconnect = useCallback(() => setAttempt((n) => n + 1), [])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let disposed = false
    let socket: TerminalSocket | null = null
    let cleanup: (() => void) | undefined

    ;(async () => {
      // xterm touches `window` at import time, so load it on the client only.
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ])
      if (disposed) return

      // xterm measures the glyph cell once at open(); if the web font is
      // not in yet it measures the fallback and rows/cols are off (lines
      // sink below the box). So resolve the family from the CSS variable
      // and wait for it before opening.
      const family =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--font-terminal")
          .trim() || "ui-monospace"
      const fontFamily = `${family}, "Fira Code", ui-monospace, monospace`
      const fontSize = 13
      // Bounded wait: a slow/blocked font download must not hold the shell.
      await Promise.race([
        document.fonts.load(`${fontSize}px ${family}`).catch(() => []),
        new Promise((r) => setTimeout(r, 1500)),
      ])
      if (disposed) return

      const term = new Terminal({
        cursorBlink: true,
        fontFamily,
        fontSize,
        // A little air between lines; the shell is easier to scan.
        lineHeight: 1.4,
        theme: { background: "#0a0a0a" },
        scrollback: 5000,
      })
      const fit = new FitAddon()
      term.loadAddon(fit)
      term.open(host)
      const refit = () => {
        fit.fit()
        // The fit addon divides by xterm's *unrounded* cell height, while
        // the DOM renders each row at a rounded pixel height; with a
        // non-integer line height that can leave the last row hanging
        // below the box. Measure a rendered row and trim if needed.
        const row = host.querySelector<HTMLElement>(".xterm-rows > div")
        const style = getComputedStyle(host)
        const inner =
          host.clientHeight -
          parseFloat(style.paddingTop) -
          parseFloat(style.paddingBottom)
        const rowHeight = row?.getBoundingClientRect().height ?? 0
        if (rowHeight > 0) {
          const rows = Math.max(1, Math.floor(inner / rowHeight))
          if (rows < term.rows) term.resize(term.cols, rows)
        }
        socket?.emit("resize", { cols: term.cols, rows: term.rows })
      }
      refit()
      // Row elements appear on the first paint, so measure again once
      // they exist (and once more after fonts/layout settle).
      requestAnimationFrame(refit)
      const settle = setTimeout(refit, 250)

      const observer = new ResizeObserver(refit)
      observer.observe(host)
      // Late font swaps (or a different fallback) change the cell size.
      document.fonts.addEventListener("loadingdone", refit)

      const inputSub = term.onData((d) => socket?.emit("input", d))

      setStatus("connecting")
      let ticket: string
      try {
        ;({ ticket } = await createTerminalTicket(serverId))
      } catch {
        if (!disposed) setStatus("error")
        term.writeln("\x1b[31mTidak dapat membuat tiket terminal.\x1b[0m")
        return
      }
      if (disposed) return

      fit.fit()
      const auth: TerminalHandshakeAuth = {
        ticket,
        cols: term.cols,
        rows: term.rows,
      }
      // One shell per page visit; the ticket expires in 60s, so no auto-reconnect.
      socket = io(terminalNamespaceUrl(publicApiUrl), {
        auth,
        transports: ["websocket"],
        reconnection: false,
      })
      socket.on("connect", () => {
        setStatus("connected")
        term.focus()
      })
      socket.on("output", (data) => term.write(data))
      socket.on("exit", (code) =>
        term.writeln(`

[33m[shell keluar dengan kode ${code}][0m`)
      )
      socket.on("error", (message) => {
        setStatus("error")
        term.writeln(`

[31m${message}[0m`)
      })
      socket.on("connect_error", () => setStatus("error"))
      socket.on("disconnect", (reason) => {
        setStatus((s) => (s === "error" ? s : "closed"))
        term.writeln(`

[90m[${reason}][0m`)
      })

      cleanup = () => {
        clearTimeout(settle)
        observer.disconnect()
        document.fonts.removeEventListener("loadingdone", refit)
        inputSub.dispose()
        term.dispose()
      }
    })()

    return () => {
      disposed = true
      socket?.disconnect()
      cleanup?.()
    }
  }, [attempt, publicApiUrl, serverId])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {servers.length > 0 && (
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger size="sm" aria-label="Target terminal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LOCAL_TARGET}>Host aoox</SelectItem>
                {servers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    <span className="text-muted-foreground">
                      {" "}
                      · {s.username}@{s.host}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Badge variant={status === "connected" ? "default" : "secondary"}>
            {STATUS_LABEL[status]}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={reconnect}
          disabled={status === "connecting"}
        >
          <RotateCw data-icon="inline-start" />
          Sambung ulang
        </Button>
      </div>
      <div
        ref={hostRef}
        className="min-h-0 flex-1 overflow-hidden rounded-md border bg-[#0a0a0a] p-2 [&_.xterm]:h-full"
      />
    </div>
  )
}
