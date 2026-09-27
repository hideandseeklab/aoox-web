import { useSyncExternalStore } from "react"

const noop = () => () => {}
const getHost = () => window.location.hostname
const getServerHost = () => null

/**
 * The hostname the panel was opened on — `null` on the server and until
 * hydration. Stacks run on the same machine as the panel, so a port they
 * publish is reachable at this host (dev: `localhost`; a server: its IP).
 */
export function useBrowserHost(): string | null {
  return useSyncExternalStore(noop, getHost, getServerHost)
}

const getOrigin = () => window.location.origin

/**
 * Scheme + host + port the panel was opened on — `null` on the server and
 * until hydration. Compare against the API's configured `WEB_ORIGIN` to spot
 * a page opened from a different origin than the one its WebSocket gateways
 * (Terminal, realtime logs) will accept.
 */
export function useBrowserOrigin(): string | null {
  return useSyncExternalStore(noop, getOrigin, getServerHost)
}
