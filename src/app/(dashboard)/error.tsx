"use client"

import { RotateCw } from "lucide-react"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
      <p className="text-sm font-medium">Terjadi kesalahan</p>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "Tidak dapat memuat halaman ini."}
        {error.digest && (
          <span className="mt-1 block font-mono text-xs">
            ref: {error.digest}
          </span>
        )}
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        <RotateCw data-icon="inline-start" />
        Coba lagi
      </Button>
    </div>
  )
}
