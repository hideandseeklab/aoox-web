/** Mirrors `PanelDomainSettings` in the API (panel-domain module). */
export interface PanelDomainSettings {
  webHost: string | null
  apiHost: string | null
  acmeEmail: string | null
  updatedAt: string | null
}

/** Mirrors `PanelDomainStatus` (`GET /instance/domain`). */
export interface PanelDomainStatus {
  settings: PanelDomainSettings
  applied: { webOrigin: string | null; publicApiUrl: string | null }
  installDirConfigured: boolean
}

export interface UpdatePanelDomainInput {
  webHost: string
  apiHost: string
  acmeEmail?: string
}
