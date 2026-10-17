/** Mirrors `PanelDomainSettings` in the API (panel-domain module). */
export interface PanelDomainSettings {
  webHost: string | null
  apiHost: string | null
  acmeEmail: string | null
  restrictPorts: boolean
  updatedAt: string | null
}

/** Mirrors `PanelDomainStatus` (`GET /instance/domain`). */
export interface PanelDomainStatus {
  settings: PanelDomainSettings
  applied: {
    webOrigin: string | null
    publicApiUrl: string | null
    /** From the running containers; null = cannot be inspected. */
    portsRestricted: boolean | null
  }
  installDirConfigured: boolean
}

export interface UpdatePanelDomainInput {
  webHost: string
  apiHost: string
  acmeEmail?: string
  restrictPorts?: boolean
}

/** Mirrors `UpdatePanelDomainResult` (`PATCH /instance/domain`). */
export interface UpdatePanelDomainResult {
  settings: PanelDomainSettings
  proxyAutoProvisioned: boolean
  restrictPortsNote: string | null
}

/** Mirrors `ClearPanelDomainResult` (`DELETE /instance/domain`). */
export interface ClearPanelDomainResult {
  settings: PanelDomainSettings
  /** Where to reopen the dashboard after the restart; null = unknown (no PUBLIC_IP). */
  reopenUrl: string | null
}
