"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
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
import { InstanceUpdateOverlay } from "@/components/custom/instance-update-overlay"
import { takeUpdatedFlag } from "@/features/instance-update/instance-update.poll"
import { formatDateTime } from "@/i18n/format"
import { useLocale, useTranslations } from "next-intl"

const FAIL_AFTER_MS = 5 * 60 * 1000

/**
 * Checks aoox's own `api`/`web` images against the registry and applies the
 * update (pull + restart) from the dashboard, instead of SSH + manual
 * `docker compose pull && up -d`.
 *
 * Applying recreates this very panel's containers. While it runs,
 * `InstanceUpdateOverlay` polls two public endpoints with plain `fetch`
 * (never a server action: those are bound to the running web build and stop
 * existing once the web container is replaced) and reloads the page when both
 * report the new version. After the reload this card shows a success toast.
 */
export function InstanceUpdateCard({
  status,
  apiUrl,
}: {
  status: InstanceUpdateStatus
  /** Browser-visible API base URL (`PUBLIC_API_URL`), for the overlay's probe. */
  apiUrl: string
}) {
  const t = useTranslations("infra.update")
  const locale = useLocale()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState(status)
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Reload-resilience: a page loaded mid-update (per `status.applying`, read
  // from `instance_update_state.apply_started_at` in the DB, which survives a
  // browser refresh and the API's own restart) reopens the overlay with the
  // original start time, so the timers keep counting from when the update
  // actually began. Past the 5-minute limit it shows the inline failure alert
  // instead of blocking the page again.
  const [resume] = useState(() => {
    if (!status.applying) return { at: 0, stale: false }
    const at = status.applyStartedAt
      ? new Date(status.applyStartedAt).getTime()
      : Date.now()
    return { at, stale: Date.now() - at > FAIL_AFTER_MS }
  })
  const [applying, setApplying] = useState(status.applying && !resume.stale)
  const [timedOut, setTimedOut] = useState(resume.stale)
  const [startedAt, setStartedAt] = useState(resume.at)
  // The version being installed, frozen when Apply is pressed (the status may
  // be re-checked while the overlay is up).
  const [target, setTarget] = useState<string | null>(
    status.applying ? status.version.latestVersion : null
  )

  // After the post-update reload: success toast, and clear the server-side
  // "applying" marker (it is cleared lazily by the progress call) so the
  // sidebar badge stops saying "Updating…".
  useEffect(() => {
    const version = takeUpdatedFlag()
    if (version === null) return
    toast.success(t("updatedToast", { version }), {
      action: {
        label: t("changelog"),
        onClick: () =>
          window.open(
            locale === "id"
              ? "https://aoox.dev/id/changelog"
              : "https://aoox.dev/changelog",
            "_blank",
            "noopener"
          ),
      },
    })
    void pingInstanceUpdateAction().then(() => router.refresh())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const available =
    current.api.updateAvailable ||
    current.web.updateAvailable ||
    current.version.updateAvailable

  const confirmApply = () => {
    setConfirmOpen(false)
    setError(null)
    setTimedOut(false)
    setStartedAt(Date.now())
    setTarget(
      current.version.updateAvailable ? current.version.latestVersion : null
    )
    setApplying(true)
    start(async () => {
      let result: Awaited<ReturnType<typeof applyInstanceUpdateAction>>
      try {
        result = await applyInstanceUpdateAction()
      } catch {
        // The server action's RPC itself failed: the web container was
        // likely already being replaced by the time the response would have
        // come back. Treat exactly like `networkError: true`.
        result = { ok: false, error: "", networkError: true }
      }
      if (!result.ok && !result.networkError) {
        setApplying(false)
        toast.error(result.error)
      }
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

        {!applying && (
          <div className="flex flex-wrap justify-end gap-2">
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
          <p className="text-right text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        {timedOut && (
          <Alert variant="destructive">
            <AlertTitle>{t("timedOut.title")}</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{t("timedOut.intro")}</p>
              <pre className="overflow-x-auto rounded bg-muted p-2 font-mono text-xs">
                {`docker ps -a --filter label=com.docker.compose.project=aoox\ndocker logs --tail 100 aoox-api-1\ndocker logs --tail 100 aoox-web-1`}
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

      {applying && (
        <InstanceUpdateOverlay
          startedAt={startedAt}
          fromVersion={current.currentVersion}
          fromWebVersion={process.env.NEXT_PUBLIC_WEB_VERSION ?? null}
          targetVersion={target}
          apiUrl={apiUrl}
          onClose={() => {
            setApplying(false)
            setTimedOut(true)
          }}
        />
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("confirm.title")}</DialogTitle>
            <DialogDescription>{t("confirm.description")}</DialogDescription>
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
        {image.error && (
          <p className="mt-1 text-xs break-words text-destructive">
            {image.error}
          </p>
        )}
      </div>
      {image.error ? (
        <Badge variant="destructive" className="shrink-0">
          {t("image.lookupFailed")}
        </Badge>
      ) : image.currentDigest === null ? (
        <Badge variant="outline">{t("image.newBaseline")}</Badge>
      ) : image.updateAvailable ? (
        <Badge>{t("image.available")}</Badge>
      ) : (
        <Badge variant="secondary">{t("image.latest")}</Badge>
      )}
    </li>
  )
}
