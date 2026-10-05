/** Mirrors CertificateDto in aoox-api. The private key is never returned. */
export interface Certificate {
  id: string
  name: string
  /** Common name of the leaf certificate. */
  commonName: string | null
  /** Every name the certificate covers (SANs, e.g. `example.com`, `*.example.com`). */
  domains: string[]
  issuer: string | null
  notBefore: string
  notAfter: string
  fingerprint: string
  /** How many application domains use it. */
  usedBy: number
  createdAt: string
}
