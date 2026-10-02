"use client"

import { PathArrow } from "@/components/custom/arrows"
import "@xterm/xterm/css/xterm.css"

import { ExternalLink, RotateCw } from "lucide-react"
import type { ReactNode } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { io, type Socket } from "socket.io-client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  type TerminalErrorHint,
  type TerminalHandshakeAuth,
  type TerminalServerEvents,
} from "@/features/terminal/terminal.protocol"
import { useBrowserOrigin } from "./use-browser-host"

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

/** Where each API error hint points; Environment is owner-only (the page 404s for admins). */
const HINT_LINK: Record<
  TerminalErrorHint,
  { href: string; label: ReactNode; ownerOnly: boolean }
> = {
  environment: {
    href: "/infra/environment",
    label: (
      <>
        Infrastruktur
        <PathArrow />
        Environment
      </>
    ),
    ownerOnly: true,
  },
  servers: {
    href: "/infra/servers",
    label: (
      <>
        Infrastruktur
        <PathArrow />
        Server remote
      </>
    ),
    ownerOnly: false,
  },
}

export function TerminalView({
  publicApiUrl,
  webOrigin,
  servers,
  isOwner,
}: {
  publicApiUrl: string
  /** The panel's configured `WEB_ORIGIN` — the only origin its Socket.IO gateways accept. */
  webOrigin: string
  servers: Server[]
  isOwner: boolean
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>("connecting")
  const [errorHint, setErrorHint] = useState<TerminalErrorHint | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [target, setTarget] = useState(LOCAL_TARGET)
  const browserOrigin = useBrowserOrigin()
  // `null` until hydration — don't flash the warning before we know.
  const originMismatch = browserOrigin !== null && browserOrigin !== webOrigin
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
      setErrorHint(null)
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
      socket.on("error", (message, hint) => {
        setStatus("error")
        setErrorHint(hint ?? null)
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

  if (originMismatch) {
    const target = webOrigin + window.location.pathname + window.location.search
    return (
      <Alert variant="destructive">
        <AlertTitle>Terminal tidak bisa diakses lewat alamat ini</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            Panel ini sudah punya domain kustom (<code>{webOrigin}</code>), dan
            fitur Terminal hanya menerima koneksi dari domain itu — bukan dari{" "}
            <code>{browserOrigin}</code> yang sedang kamu pakai. Ini proteksi
            keamanan bawaan, bukan bug.
          </p>
          <Button size="sm" asChild>
            <a href={target}>
              <ExternalLink data-icon="inline-start" />
              Buka Terminal di {webOrigin}
            </a>
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

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
      {status === "error" && errorHint && (
        <Alert variant="destructive">
          <AlertTitle>Terminal belum bisa terhubung ke targetnya</AlertTitle>
          <AlertDescription>
            {HINT_LINK[errorHint].ownerOnly && !isOwner ? (
              <>
                Periksa pengaturan koneksinya di{" "}
                <strong>{HINT_LINK[errorHint].label}</strong> — halaman itu
                hanya bisa dibuka owner.
              </>
            ) : (
              <>
                Periksa pengaturan koneksinya di{" "}
                <Link
                  href={HINT_LINK[errorHint].href}
                  className="font-medium underline underline-offset-4"
                >
                  {HINT_LINK[errorHint].label}
                </Link>
                , lalu klik Sambung ulang.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}
      <div
        ref={hostRef}
        className="min-h-0 flex-1 overflow-hidden rounded-md border bg-[#0a0a0a] p-2 [&_.xterm]:h-full"
      />
    </div>
  )
}
