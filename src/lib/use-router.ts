"use client"

import { useMemo } from "react"
import { useRouter as useNextRouter } from "next/navigation"

import { isNavigationTarget, startNavigationProgress } from "@/lib/nav-progress"

/**
 * Drop-in replacement for `useRouter` from `next/navigation`: `push`/`replace`
 * to a different URL start the top progress bar (Next only touches the
 * History API once the new page is ready, so nothing else can tell that a
 * programmatic navigation has begun). `back`/`forward` are covered by the
 * bar's own `popstate` listener; `refresh` deliberately does nothing extra so
 * polling never shows the bar. Use this instead of the `next/navigation` hook
 * wherever the code calls `push` or `replace`.
 */
export function useRouter() {
  const router = useNextRouter()
  return useMemo(
    () => ({
      ...router,
      push: (...args: Parameters<typeof router.push>) => {
        if (isNavigationTarget(args[0])) startNavigationProgress()
        router.push(...args)
      },
      replace: (...args: Parameters<typeof router.replace>) => {
        if (isNavigationTarget(args[0])) startNavigationProgress()
        router.replace(...args)
      },
    }),
    [router],
  )
}
