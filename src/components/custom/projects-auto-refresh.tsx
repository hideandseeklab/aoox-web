"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Refreshes this server-rendered page every few seconds while there's a
 * reason to: a "deploying…" badge to clear once the build finishes, or a
 * running instance whose CPU/RAM/network card (`resourceUsage`, part of the
 * same `GET /projects` response) should keep updating. `router.refresh()`
 * re-fetches the whole list in one go — cheaper than a second poller on this
 * page — so the caller just picks a faster interval while something is
 * actively deploying and a calmer one otherwise; no polling once nothing is
 * running at all.
 */
export function ProjectsAutoRefresh({
  active,
  intervalMs = 4000,
}: {
  active: boolean
  intervalMs?: number
}) {
  const router = useRouter()

  useEffect(() => {
    if (!active) return
    const t = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(t)
  }, [active, intervalMs, router])

  return null
}
