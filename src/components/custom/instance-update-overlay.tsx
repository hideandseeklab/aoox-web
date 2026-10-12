"use client"

import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  isUpdated,
  phaseOf,
  probePanel,
  rememberUpdated,
  type UpdatePhase,
} from "@/features/instance-update/instance-update.poll"

const POLL_MS = 2500
const POLL_SLOW_MS = 5000
const HINT_AFTER_MS = 2 * 60 * 1000
const FAIL_AFTER_MS = 5 * 60 * 1000
// Let the third step show for a moment before the page reloads.
const RELOAD_DELAY_MS = 1500

const ORDER: UpdatePhase[] = ["downloading", "restarting", "back"]

// Compose project `aoox` (docker-compose.dist.yml) names containers
// `aoox-<service>-1`.
const DIAGNOSE_COMMANDS =
  "docker ps -a --filter label=com.docker.compose.project=aoox\n" +
  "docker logs --tail 100 aoox-api-1\n" +
  "docker logs --tail 100 aoox-web-1"

const formatElapsed = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

/**
 * Full-screen, non-dismissable overlay (mounted only while an update is applying) shown while the panel replaces its own
 * containers. It never calls a server action: those are bound to the running
 * web build and stop working the moment the web container is replaced, so it
 * polls two public endpoints with plain `fetch` (see `instance-update.poll.ts`)
 * and reloads once both report the new version.
 */
export function InstanceUpdateOverlay({
  startedAt,
  fromVersion,
  fromWebVersion,
  targetVersion,
  apiUrl,
  onClose,
}: {
  /** Epoch ms when Apply was confirmed (or the server-recorded start after a reload). */
  startedAt: number
  fromVersion: string
  fromWebVersion: string | null
  /** Version being installed; null when unknown. */
  targetVersion: string | null
  /** Browser-visible API base URL; the discovery document may refine it. */
  apiUrl: string
  onClose: () => void
}) {
  const t = useTranslations("infra.update.overlay")
  const [now, setNow] = useState(startedAt)
  const [phase, setPhase] = useState<UpdatePhase>("downloading")
  const [unreachable, setUnreachable] = useState(false)

  // Mutable poll state lives in refs so the loop never restarts on re-render.
  const sawDown = useRef({ web: false, api: false })
  const apiBase = useRef<string | null>(apiUrl)
  const reloading = useRef(false)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false
    let timeout: ReturnType<typeof setTimeout> | undefined

    const tick = async () => {
      const probe = await probePanel(apiBase.current)
      if (cancelled) return
      if (probe.apiUrl) apiBase.current = probe.apiUrl
      if (!probe.web.reachable) sawDown.current.web = true
      if (!probe.api.reachable) sawDown.current.api = true
      const webNew = isUpdated(
        probe.web,
        fromWebVersion,
        targetVersion,
        sawDown.current.web
      )
      const apiNew = isUpdated(
        probe.api,
        fromVersion,
        targetVersion,
        sawDown.current.api
      )
      const down = !probe.web.reachable || !probe.api.reachable
      setUnreachable(down)
      const next = phaseOf(
        webNew,
        apiNew,
        down || sawDown.current.web || sawDown.current.api
      )
      // Never step backwards: a half-restarted panel can briefly look "old" again.
      setPhase((prev) =>
        ORDER.indexOf(next) > ORDER.indexOf(prev) ? next : prev
      )

      if (next === "back" && !reloading.current) {
        reloading.current = true
        rememberUpdated(probe.api.version ?? targetVersion ?? "")
        setTimeout(() => window.location.reload(), RELOAD_DELAY_MS)
        return
      }
      const late = Date.now() - startedAt > FAIL_AFTER_MS
      timeout = setTimeout(() => void tick(), late ? POLL_SLOW_MS : POLL_MS)
    }
    void tick()
    return () => {
      cancelled = true
      if (timeout) clearTimeout(timeout)
    }
  }, [startedAt, fromVersion, fromWebVersion, targetVersion])

  const elapsed = now - startedAt
  const failed = elapsed >= FAIL_AFTER_MS && phase !== "back"
  const slow = elapsed >= HINT_AFTER_MS && !failed && phase !== "back"

  const steps: { key: UpdatePhase; label: string }[] = [
    { key: "downloading", label: t("steps.download") },
    { key: "restarting", label: t("steps.restart") },
    { key: "back", label: t("steps.back") },
  ]

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md [&>*]:min-w-0"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{failed ? t("failed.title") : t("title")}</DialogTitle>
          <DialogDescription>
            {t("versions", {
              from: `v${fromVersion}`,
              to: targetVersion ? `v${targetVersion}` : t("unknownTarget"),
            })}
          </DialogDescription>
        </DialogHeader>

        {failed ? (
          <div className="space-y-3 text-xs" role="alert">
            <div className="flex gap-2">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p>{t("failed.body")}</p>
            </div>
            <pre className="overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs">
              {DIAGNOSE_COMMANDS}
            </pre>
            <p className="text-xs text-muted-foreground">{t("failed.logs")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <ol className="space-y-2 rounded-md border p-3 text-xs">
              {steps.map((s) => {
                const idx = ORDER.indexOf(s.key)
                const cur = ORDER.indexOf(phase)
                const done = idx < cur || (s.key === "back" && phase === "back")
                const active = idx === cur && !done
                return (
                  <li key={s.key} className="flex items-center gap-2">
                    {done ? (
                      <CheckCircle2 className="size-4 shrink-0 text-primary" />
                    ) : active ? (
                      <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                    ) : (
                      <span className="size-4 shrink-0 rounded-full border" />
                    )}
                    <span
                      className={
                        done || active
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {s.label}
                    </span>
                  </li>
                )
              })}
            </ol>
            {unreachable && phase !== "back" && (
              <p
                className="text-xs text-muted-foreground"
                role="status"
                data-testid="update-waiting"
              >
                {t("waiting")}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{t("explain")}</p>
            {slow && (
              <p className="text-xs" data-testid="update-slow">
                {t.rich("slow", { code: (c) => <code>{c}</code> })}
              </p>
            )}
          </div>
        )}

        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {t("elapsed", { time: formatElapsed(elapsed) })}
        </span>

        {(slow || failed) && (
          <DialogFooter>
            {failed && (
              <Button variant="outline" onClick={onClose}>
                {t("failed.close")}
              </Button>
            )}
            <Button onClick={() => window.location.reload()}>
              {failed ? t("failed.reload") : t("reloadNow")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
