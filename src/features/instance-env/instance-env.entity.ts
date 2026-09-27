/** Mirrors `InstanceEnvStatus` in the API (instance-env module). */
export interface InstanceEnvStatus {
  installDirConfigured: boolean
  terminalSshHost: string | null
  terminalSshPort: string | null
  terminalSshUser: string | null
  terminalSshPasswordSet: boolean
  publicIp: string | null
  registryPublicHost: string | null
}

export interface UpdateInstanceEnvInput {
  terminalSshHost?: string
  terminalSshPort?: number
  terminalSshUser?: string
  terminalSshPassword?: string
  publicIp?: string
  registryPublicHost?: string
}
