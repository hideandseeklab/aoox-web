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
}
