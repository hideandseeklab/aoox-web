"use client"

import { CheckCircle2, Loader2 } from "lucide-react"
import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  applyInstanceUpdateAction,
  checkInstanceUpdateAction,
  pingInstanceUpdateAction,
} from "@/features/instance-update/instance-update.actions"
import type { InstanceUpdateStatus } from "@/features/instance-update/instance-update.entity"
import { formatDateTime } from "@/i18n/format"
import { useLocale, useTranslations } from "next-intl"

// Poll delay grows from 3s up to a 10s cap while waiting for the panel to
// come back — frequent enough to feel responsive, gentle enough not to spam
// a container that may still be restarting.
const POLL_START_MS = 3000
const POLL_MAX_MS = 10_000
const POLL_TIMEOUT_MS = 5 * 60 * 1000

/**
 * Checks aoox's own `api`/`web` images against the registry and applies the
 * update (pull + restart) from the dashboard, instead of SSH + manual
 * `docker compose pull && up -d`.
 *
 * Applying recreates this very panel's containers, so a connection failure
 * while polling is *expected*, not an error — see `applying`'s poll loop
 * below, which swallows every failure (network-level or a thrown rejection
 * from the server action's own RPC, which Next surfaces as a rejected
 * promise at the call site rather than routing it through the action's own
 * try/catch — the container can die mid-request) and just keeps retrying
 * until the panel reports a new version, or the 5-minute timeout below.
 */
export function InstanceUpdateCard({
  status,
}: {
  status: InstanceUpdateStatus
}) {
  const t = useTranslations("infra.update")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState(status)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [applying, setApplying] = useState(status.applying)
  const [timedOut, setTimedOut] = useState(false)

  const toastIdRef = useRef<string | number | undefined>(undefined)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // `Date.now()`/`new Date()` are impure, so the initial value is computed in
  // the mount effect below rather than in this render-time initializer.
  const startedAtRef = useRef<number | null>(null)

  // Reload-resilience: if the page loads mid-update (per `status.applying`,
  // read from `instance_update_state.apply_started_at` in the DB — survives
  // both a browser refresh and the API's own restart), pick up the original
  // start time so the 5-minute timeout below still counts from when the
  // update actually began, not from this fresh page load.
  useEffect(() => {
    startedAtRef.current = status.applyStartedAt
      ? new Date(status.applyStartedAt).getTime()
      : Date.now()
    if (
      status.applying &&
      Date.now() - startedAtRef.current > POLL_TIMEOUT_MS
    ) {
      setApplying(false)
      setTimedOut(true)
    }
    // Only ever relevant for the very first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!applying) return
    let cancelled = false
    let delay = POLL_START_MS
    // A successful poll only proves the *api* container answered with a new
    // version — the *web* container (which this very poll runs inside, as a
    // server action) could still be the old one on its way out if it happens
    // to shut down slightly later than api's. One confirming poll a couple
    // seconds later, after api first reports done, gives web a moment to
    // have cycled too before reloading into it.
    let confirmedOnce = false

    const tick = () => {
      void (async () => {
        if (cancelled) return
        if (
          Date.now() - (startedAtRef.current ?? Date.now()) >
          POLL_TIMEOUT_MS
        ) {
          setApplying(false)
          setTimedOut(true)
          toast.error(t("timeoutToast"), { id: toastIdRef.current })
          return
        }
        let reachable = false
        let done = false
        let version = ""
        try {
          const r = await pingInstanceUpdateAction()
          reachable = r.ok
          done = r.ok && !r.data.applying
          version = r.ok ? r.data.currentVersion : ""
        } catch {
          // Server action's own RPC failed (container mid-restart) — ignore and retry.
        }
        if (cancelled) return
        if (done) {
          if (confirmedOnce) {
            toast.success(t("doneToast", { version }), {
              id: toastIdRef.current,
            })
            window.location.reload()
            return
          }
          confirmedOnce = true
          pollTimerRef.current = setTimeout(tick, 2000)
          return
        }
        // A reachable-but-still-applying response means api is back but not
        // yet done — any earlier confirmation was premature (api restarted,
        // then web restarted later and is still applying by the time web
        // answers this poll), so don't carry it into a later done response.
        if (reachable) confirmedOnce = false
        delay = Math.min(delay * 1.4, POLL_MAX_MS)
        pollTimerRef.current = setTimeout(tick, delay)
      })()
    }

    pollTimerRef.current = setTimeout(tick, delay)
    return () => {
      cancelled = true
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
  }, [applying, t])

  const available =
    current.api.updateAvailable ||
    current.web.updateAvailable ||
    current.version.updateAvailable

  const confirmApply = () => {
    setConfirmOpen(false)
    setError(null)
    setTimedOut(false)
    startedAtRef.current = Date.now()
    setApplying(true)
    toastIdRef.current = toast.loading(t("sendingToast"))
    start(async () => {
      let result: Awaited<ReturnType<typeof applyInstanceUpdateAction>>
      try {
        result = await applyInstanceUpdateAction()
      } catch {
        // The server action's RPC itself failed — the web container was
        // likely already being replaced by the time the response would have
        // come back. Treat exactly like `networkError: true`.
        result = { ok: false, error: "", networkError: true }
      }
      if (!result.ok && !result.networkError) {
        setApplying(false)
        toast.error(result.error, { id: toastIdRef.current })
        return
      }
      toast.loading(t("restartingToast"), {
        id: toastIdRef.current,
      })
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t.rich("description", {
            version: current.currentVersion,
            code: (c) => <code>{c}</code>,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!current.installDirConfigured && !applying && (
          <Alert variant="destructive">
            <AlertTitle>{t("installDirTitle")}</AlertTitle>
            <AlertDescription>
              {t.rich("installDirBody", { code: (c) => <code>{c}</code> })}
            </AlertDescription>
          </Alert>
        )}

        <VersionSummary version={current.version} />

        <ul className="divide-y rounded-md border text-xs">
          <ImageRow label="api" image={current.api} />
          <ImageRow label="web" image={current.web} />
        </ul>

        {applying ? (
          <ApplyingProgress />
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null)
                  const r = await checkInstanceUpdateAction()
                  if (r.ok) setCurrent(r.data)
                  else setError(r.error)
                })
              }
            >
              {pending ? t("checking") : t("check")}
            </Button>
            <Button
              size="sm"
              disabled={pending || !available || !current.installDirConfigured}
              onClick={() => setConfirmOpen(true)}
            >
              {t("apply")}
            </Button>
          </div>
        )}

        {error && !applying && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        {timedOut && (
          <Alert variant="destructive">
            <AlertTitle>{t("timedOut.title")}</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{t("timedOut.intro")}</p>
              <pre className="overflow-x-auto rounded bg-muted p-2 font-mono text-xs">
                {`docker ps -a\ndocker logs <container-api>`}
              </pre>
              <p>
                {t.rich("timedOut.manual", { code: (c) => <code>{c}</code> })}
              </p>
              <pre className="overflow-x-auto rounded bg-muted p-2 font-mono text-xs">
                {`docker compose -f docker-compose.dist.yml \\\n  --env-file .env.dist up -d`}
              </pre>
              <p>{t("timedOut.docs")}</p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("confirm.title")}</DialogTitle>
            <DialogDescription>
              {t("confirm.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={confirmApply}>{t("apply")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

/** Same signal as the sidebar badge, so the two can never contradict each other. */
function VersionSummary({
  version,
}: {
  version: InstanceUpdateStatus["version"]
}) {
  const t = useTranslations("infra.update")
  const code = (c: React.ReactNode) => <code>{c}</code>
  const locale = useLocale()
  const checked = version.latestCheckedAt
    ? // Fixed zone: rendered on the server and again on the client.
      formatDateTime(version.latestCheckedAt, locale, {
        timeZone: "UTC",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " UTC"
    : null

  let message: React.ReactNode
  if (!version.latestVersion) {
    message = t("version.unknown")
  } else if (version.tracking === "pinned") {
    message = t.rich("version.pinned", {
      tag: version.trackedTag ?? "",
      latest: version.latestVersion,
      code,
    })
  } else if (version.tracking === "unknown") {
    message = t.rich("version.untracked", {
      latest: version.latestVersion,
      code,
    })
  } else if (version.updateAvailable) {
    message = t.rich("version.available", {
      latest: version.latestVersion,
      code,
      badge: (c) => <Badge>{c}</Badge>,
    })
  } else {
    message = t.rich("version.upToDate", {
      latest: version.latestVersion,
      code,
    })
  }

  return (
    <div className="rounded-md border px-3 py-2 text-xs">
      <p>{message}</p>
      {checked && (
        <p className="mt-1 text-xs text-muted-foreground">
          {t("version.lastChecked", { time: checked })}
        </p>
      )}
    </div>
  )
}

function ApplyingProgress() {
  const t = useTranslations("infra.update")
  return (
    <ol className="space-y-2 rounded-md border p-3 text-xs">
      <ProgressStep label={t("progress.sending")} done />
      <ProgressStep label={t("progress.restarting")} active />
    </ol>
  )
}

function ProgressStep({
  label,
  done,
  active,
}: {
  label: string
  done?: boolean
  active?: boolean
}) {
  return (
    <li className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="size-4 shrink-0 text-primary" />
      ) : active ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
      ) : (
        <span className="size-4 shrink-0 rounded-full border" />
      )}
      <span className={active ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
    </li>
  )
}

function ImageRow({
  label,
  image,
}: {
  label: string
  image: InstanceUpdateStatus["api"]
}) {
  const t = useTranslations("infra.update")
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {image.image}
        </p>
      </div>
      {image.currentDigest === null ? (
        <Badge variant="outline">{t("image.newBaseline")}</Badge>
      ) : image.updateAvailable ? (
        <Badge>{t("image.available")}</Badge>
      ) : (
        <Badge variant="secondary">{t("image.latest")}</Badge>
      )}
    </li>
  )
}
