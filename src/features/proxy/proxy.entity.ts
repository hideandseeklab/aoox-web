export interface ProxyStatus {
  installed: boolean
  running: boolean
  state: string | null
  containerId: string | null
  httpPort: number
  httpsPort: number
  acmeEmail: string | null
  /** The running proxy has the DNS-01 resolver. */
  dnsChallenge?: boolean
  /** The running proxy loads files (custom certificates, dynamic configuration). */
  customCerts?: boolean
  /** Read timeout (seconds) the running proxy was created with; null = Traefik's default (60 s). */
  readTimeout?: number | null
  /** The panel's `PROXY_READ_TIMEOUT` in seconds (null = default); applied on the next proxy install. */
  configuredReadTimeout?: number | null
}
