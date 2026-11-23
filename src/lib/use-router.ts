"use client"

import { useMemo } from "react"
import { useRouter as useNextRouter } from "next/navigation"

import { isNavigationTarget, startNavigationProgress } from "@/lib/nav-progress"
import { confirmDiscard } from "@/lib/unsaved-changes"

/**
 * Drop-in replacement for `useRouter` from `next/navigation`: `push`/`replace`
 * to a different URL start the top progress bar (Next only touches the
 * History API once the new page is ready, so nothing else can tell that a
 * programmatic navigation has begun). `back`/`forward` are covered by the
 * bar's own `popstate` listener; `refresh` deliberately does nothing extra so
 * polling never shows the bar. Use this instead of the `next/navigation` hook
 * wherever the code calls `push` or `replace`. A `push`/`replace` to another
 * page while an editor has unsaved changes asks first (`confirmDiscard`); a
 * form that navigates after a successful save calls `clearUnsavedChanges()`
 * right before it.
 */
export function useRouter() {
  const router = useNextRouter()
  return useMemo(
    () => ({
      ...router,
      push: (...args: Parameters<typeof router.push>) => {
        const go = () => {
          if (isNavigationTarget(args[0])) startNavigationProgress()
          router.push(...args)
        }
        if (isNavigationTarget(args[0])) confirmDiscard(go)
        else go()
      },
      replace: (...args: Parameters<typeof router.replace>) => {
        const go = () => {
          if (isNavigationTarget(args[0])) startNavigationProgress()
          router.replace(...args)
        }
        if (isNavigationTarget(args[0])) confirmDiscard(go)
        else go()
      },
    }),
    [router],
  )
}
