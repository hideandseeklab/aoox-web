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
