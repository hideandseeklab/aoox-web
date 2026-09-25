"use client"

import {
  CircleCheck,
  CircleX,
  Loader2,
  Play,
  Rocket,
  Square,
  Trash2,
  Webhook,
} from "lucide-react"
import { useEffect, useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  fetchComposeDeploymentAction,
  fetchComposeDeploymentsAction,
} from "@/features/compose/compose.actions"
import type {
  ComposeDeployment,
  ComposeDeploymentAction,
} from "@/features/compose/compose.entity"

const POLL_MS = 3_000

const ICON: Record<ComposeDeploymentAction, typeof Rocket> = {
  deploy: Rocket,
  stop: Square,
  start: Play,
  down: Trash2,
}

function fmt(d: string) {
  return new Date(d).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

/** Seconds a run took, or how long it has been going. */
function took(run: ComposeDeployment) {
  const end = run.finishedAt ? Date.parse(run.finishedAt) : Date.now()
  return `${Math.max(0, Math.round((end - Date.parse(run.startedAt)) / 1000))}s`
}

/**
 * Every helper run of a stack: what was run, by whom (manual or a push),
 * and the output it produced. A stack is N containers, so unlike an
 * application there is no image or rollback here — only the action log.
 */
export function ComposeHistory({
  appId,
  initial,
}: {
  appId: string
  initial: ComposeDeployment[]
}) {
  const [runs, setRuns] = useState(initial)
  const [openId, setOpenId] = useState<string | null>(null)
  const [logs, setLogs] = useState<string>("")
  const [, start] = useTransition()
  const busy = runs.some((r) => r.status === "running")

  useEffect(() => {
    if (!busy) return
    let cancelled = false
    const timer = setInterval(async () => {
      const next = await fetchComposeDeploymentsAction(appId)
      if (!cancelled && next.length) setRuns(next)
    }, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [busy, appId])

  const open = (id: string) =>
    start(async () => {
      if (openId === id) return setOpenId(null)
      setOpenId(id)
      setLogs("")
      const run = await fetchComposeDeploymentAction(id)
      setLogs(run?.logs || "Tidak ada output.")
    })

  if (runs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada riwayat — deploy dulu.
      </p>
    )
  }

  return (
    <ul className="divide-y rounded-md border text-sm">
      {runs.map((r) => {
        const Icon = ICON[r.action]
        return (
          <li key={r.id} className="px-3 py-2">
            <div className="flex items-center gap-3">
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-medium">{r.action}</span>
                  {r.trigger === "webhook" && (
                    <Badge variant="outline" title="Dipicu push ke repository">
                      <Webhook className="size-3" /> webhook
                    </Badge>
                  )}
                  {r.commitSha && (
                    <code className="text-xs text-muted-foreground">
                      {r.commitSha.slice(0, 8)}
                    </code>
                  )}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {fmt(r.startedAt)} · {took(r)}
                  {r.errorMessage ? ` · ${r.errorMessage}` : ""}
                </span>
              </span>
              {r.status === "running" ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : r.status === "success" ? (
                <CircleCheck className="size-4 text-muted-foreground" />
              ) : (
                <CircleX className="size-4 text-destructive" />
              )}
              <Button variant="ghost" size="sm" onClick={() => open(r.id)}>
                {openId === r.id ? "Tutup" : "Log"}
              </Button>
            </div>
            {openId === r.id && (
              <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-[#0a0a0a] p-3 font-mono text-xs whitespace-pre-wrap text-neutral-200">
                {logs || "Memuat…"}
              </pre>
            )}
          </li>
        )
      })}
    </ul>
  )
}
