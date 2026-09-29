/**
 * Glue between "a page navigation is starting" (Link clicks are picked up by
 * `NavigationProgress` itself; programmatic `router.push/replace` announce
 * themselves through here) and the top progress bar. Nothing here knows about
 * `router.refresh()` on purpose: polling/refresh keeps the same URL, so it
 * never counts as a navigation.
 */
export const NAV_START_EVENT = "aoox:navigation-start"

/** True when `href` is an in-app URL that would land on a different path/query than the current page. */
export function isNavigationTarget(href: string | URL): boolean {
  try {
    const url = new URL(href, window.location.href)
    if (url.origin !== window.location.origin) return false
    return url.pathname + url.search !== window.location.pathname + window.location.search
  } catch {
    return false
  }
}

export function startNavigationProgress(): void {
  window.dispatchEvent(new Event(NAV_START_EVENT))
}
