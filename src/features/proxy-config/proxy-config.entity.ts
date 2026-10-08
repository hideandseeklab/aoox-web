/** Mirrors ProxyConfigItem / ProxyConfigDetail in aoox-api (proxy-config.service.ts). */
export interface ProxyConfigFile {
  id: string
  /** Slug; the file on the proxy is `user-<name>.yml`. */
  name: string
  fileName: string
  /** The remote server whose proxy loads it; null = the aoox host. */
  serverId: string | null
  enabled: boolean
  size: number
  middlewares: string[]
  routers: string[]
  services: string[]
  /** Domains that use one of this file's middlewares. */
  usedByDomains: number
  createdAt: string
  updatedAt: string
}

export interface ProxyConfigDetail extends ProxyConfigFile {
  content: string
}

/** What writing a file to the proxy found out (`sync` in create/update answers). */
export interface ProxyConfigSync {
  files: number
  proxy: "running" | "not-running" | "not-installed"
  proxyRecreated: boolean
  /** Traefik's own error lines about the file; empty when it loaded cleanly. */
  errors: string[]
  verified: boolean
  /** Why a saved file may not be live yet (proxy stopped or not installed). */
  warning: string | null
  /** Set when the proxy was recreated once to load the files. */
  notice: string | null
}

/** What to know before the first write to a proxy (`GET /proxy/config/status`). */
export interface ProxyConfigState {
  proxy: "running" | "not-running" | "not-installed"
  fileProvider: boolean
  /** Writing an enabled file now recreates the proxy (older aoox): a few seconds without service. */
  needsRecreate: boolean
}

export interface ProxyConfigWrite {
  file: ProxyConfigDetail
  sync: ProxyConfigSync
}

export interface PresetField {
  key: string
  label: string
  type: "text" | "password" | "number" | "boolean" | "select" | "list"
  required: boolean
  default?: string | number | boolean
  options?: string[]
  hint?: string
}

export interface ProxyPreset {
  id: string
  label: string
  description: string
  defaultName: string
  fields: PresetField[]
}

export interface PresetResult {
  /** Suggested file name. */
  name: string
  /** YAML ready to save. */
  content: string
}

/** Same rule as CONFIG_NAME in the API. */
export const CONFIG_NAME = /^[a-z0-9][a-z0-9-]{0,39}$/
