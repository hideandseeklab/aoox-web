import { TriangleAlert } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { ActionAlert } from "@/components/custom/action-alert"

/**
 * Shown on a detail page whose API read found the Docker daemon unreachable:
 * the page still renders from the database and says what is unavailable.
 */
export async function DaemonUnreachableAlert({
  reason,
  className,
}: {
  reason: string | null | undefined
  className?: string
}) {
  if (!reason) return null
  const t = await getTranslations("common.daemonUnreachable")
  return (
    <ActionAlert
      variant="warning"
      icon={<TriangleAlert />}
      title={t("title")}
      description={t("description")}
      className={className}
    >
      <p className="font-mono text-xs break-words opacity-80">
        {t("reason", { reason })}
      </p>
    </ActionAlert>
  )
}
