"use client"

import { Loader2, TriangleAlert } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { ActionAlert } from "@/components/custom/action-alert"
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
    <ActionAlert
      variant="warning"
      icon={<TriangleAlert />}
      className={className}
      description={
        <>
          {t(single !== null ? "single" : "multiple", {
            exposed,
            port: containerPort,
          })}
          {error && (
            <span className="mt-1 block text-destructive" role="alert">
              {error}
            </span>
          )}
        </>
      }
      actions={
        canEdit && single !== null ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={apply}
          >
            {pending && <Loader2 className="animate-spin" />}
            {pending ? tc("states.saving") : t("useButton", { exposed })}
          </Button>
        ) : undefined
      }
    />
  )
}
