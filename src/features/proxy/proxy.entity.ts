export interface ProxyStatus {
  installed: boolean
  running: boolean
  state: string | null
  containerId: string | null
  httpPort: number
  httpsPort: number
  acmeEmail: string | null
}
