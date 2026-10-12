"use client"

import { Loader2, TriangleAlert } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { setContainerPortAction } from "@/features/application/application.actions"
import { useRouter } from "@/lib/use-router"

/**
 * Warns when the image declares EXPOSE ports and the configured Container
 * port is none of them (the usual cause of "Bad Gateway" behind a domain).
 * Developers and owners get a one-click fix when the image exposes exactly
 * one port; viewers only read the warning.
 */
export function ExposedPortAlert({
  applicationId,
  containerPort,
  exposedPorts,
  canEdit,
  onApplied,
  className,
}: {
  applicationId: string
  containerPort: number
  exposedPorts: number[] | null | undefined
  canEdit: boolean
  /** Lets a surrounding form follow the saved value. */
  onApplied?: (port: number) => void
  className?: string
}) {
  const t = useTranslations("applications.exposedPort")
  const tc = useTranslations("common")
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (
    !exposedPorts ||
    exposedPorts.length === 0 ||
    exposedPorts.includes(containerPort)
  ) {
    return null
  }
  const single = exposedPorts.length === 1 ? exposedPorts[0] : null
  const exposed = exposedPorts.join(", ")

  const apply = () =>
    start(async () => {
      if (single === null) return
      setError(null)
      const r = await setContainerPortAction(applicationId, single)
      if (!r.ok) {
        setError(r.error)
        return
      }
      onApplied?.(single)
      toast.success(t("applied", { port: single }))
      router.refresh()
    })

  return (
    <Alert
      className={`border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 ${className ?? ""}`}
    >
      <TriangleAlert />
      <AlertDescription className="space-y-2 text-amber-700/90 dark:text-amber-400/90">
        <p>
          {t(single !== null ? "single" : "multiple", {
            exposed,
            port: containerPort,
          })}
        </p>
        {canEdit && single !== null && (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={apply}
          >
            {pending && <Loader2 className="animate-spin" />}
            {pending ? tc("states.saving") : t("useButton", { exposed })}
          </Button>
        )}
        {error && (
          <p className="text-destructive" role="alert">
            {error}
          </p>
        )}
      </AlertDescription>
    </Alert>
  )
}
