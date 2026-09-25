/** Mirrors Template / TemplateVariable / TemplateService in aoox-api (template module). */
export interface TemplateVariable {
  key: string
  label: string
  default?: string
  generate?: "password" | "secret"
  hint?: string
  required?: boolean
}

export interface TemplateService {
  service: string
  port: number
  label: string
}

export interface Template {
  id: string
  name: string
  description: string
  version: string
  tags: string[]
  links: { website?: string; docs?: string }
  logo?: string
  variables: TemplateVariable[]
  services: TemplateService[]
  compose: string
}
