"use client"

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
  useTransition,
} from "react"
import { fetchComposeAppAction } from "@/features/compose/compose.actions"
import type { ComposeAppDetail } from "@/features/compose/compose.entity"

const POLL_MS = 3_000

interface ComposeLive {
  app: ComposeAppDetail
  /** An action is in flight from this page. */
  pending: boolean
  /** The stack is deploying/stopping on the server (status `deploying`). */
  busy: boolean
  /** Message of the last failed action, cleared when the next one starts. */
  error: string | null
  /** Runs an action, then re-reads the stack so every part of the page shows the new state. */
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void
}

const ComposeLiveContext = createContext<ComposeLive | null>(null)

/**
 * Holds the stack's live state for the whole detail page, so the status strip under the tabs and
 * the Deploy tab's panel show (and change) the same thing. Polls the detail while an action runs
 * (status `deploying`); actions are 202 + poll on the API side, so there is no streaming socket.
 */
export function ComposeLiveProvider({
  initial,
  children,
}: {
  initial: ComposeAppDetail
  children: ReactNode
}) {
  const [app, setApp] = useState(initial)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const busy = app.status === "deploying"

  useEffect(() => {
    if (!busy) return
    let cancelled = false
    const timer = setInterval(async () => {
      const next = await fetchComposeAppAction(app.id)
      if (!cancelled && next) setApp(next)
    }, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [busy, app.id])

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? "Gagal")
      else {
        const next = await fetchComposeAppAction(app.id)
        if (next) setApp(next)
      }
    })

  return (
    <ComposeLiveContext.Provider value={{ app, pending, busy, error, run }}>
      {children}
    </ComposeLiveContext.Provider>
  )
}

export function useComposeLive(): ComposeLive {
  const ctx = useContext(ComposeLiveContext)
  if (!ctx)
    throw new Error("useComposeLive must be used inside ComposeLiveProvider")
  return ctx
}
