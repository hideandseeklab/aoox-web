"use client"

import { RotateCw } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations("dashboard.error")
  const tc = useTranslations("common")
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
      <p className="text-sm font-medium">{t("title")}</p>
      <p className="max-w-md text-xs text-muted-foreground">
        {error.message || t("fallback")}
        {error.digest && (
          <span className="mt-1 block font-mono text-xs">
            {t("reference", { digest: error.digest })}
          </span>
        )}
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        <RotateCw data-icon="inline-start" />
        {tc("actions.retry")}
      </Button>
    </div>
  )
}
