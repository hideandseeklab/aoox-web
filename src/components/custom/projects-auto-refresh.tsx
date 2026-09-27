"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * While any project card shows a "deploying…" instance, refresh this
 * server-rendered page every few seconds so the badge clears itself once the
 * deploy finishes — without polling once nothing is in flight.
 */
export function ProjectsAutoRefresh({ active }: { active: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (!active) return
    const t = setInterval(() => router.refresh(), 4000)
    return () => clearInterval(t)
  }, [active, router])

  return null
}
