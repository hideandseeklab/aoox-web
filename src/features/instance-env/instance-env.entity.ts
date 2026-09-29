/** Mirrors `InstanceEnvStatus` in the API (instance-env module). */
export interface InstanceEnvStatus {
  installDirConfigured: boolean
  terminalSshHost: string | null
  terminalSshPort: string | null
  /** Raw `.env.dist` value; null when unset. */
  terminalSshUser: string | null
  /** What the terminal logs in as while `terminalSshUser` is empty. */
  terminalSshUserDefault: string
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
