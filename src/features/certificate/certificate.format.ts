import type { Certificate } from "./certificate.entity"

export const EXPIRY_WARN_DAYS = 14

export type ExpiryState = "ok" | "soon" | "expired"

export function daysLeft(notAfter: string, now = Date.now()): number {
  return Math.floor((new Date(notAfter).getTime() - now) / 86_400_000)
}

export function expiryState(notAfter: string, now = Date.now()): ExpiryState {
  const days = daysLeft(notAfter, now)
  if (days < 0) return "expired"
  if (days < EXPIRY_WARN_DAYS) return "soon"
  return "ok"
}

/** Soft green / amber / red, like the other status badges in the panel. */
export const EXPIRY_CLASS: Record<ExpiryState, string> = {
  ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  soon: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  expired: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
}

export function expiryLabel(notAfter: string, now = Date.now()): string {
  const days = daysLeft(notAfter, now)
  if (days < 0) return "kedaluwarsa"
  if (days === 0) return "berakhir hari ini"
  return `${days} hari lagi`
}

/** Does one certificate name cover `host`? A wildcard covers exactly one label. */
function nameCovers(name: string, host: string): boolean {
  const n = name.toLowerCase()
  const h = host.toLowerCase()
  if (n === h) return true
  if (n.startsWith("*.")) {
    const suffix = n.slice(1) // ".example.com"
    return (
      h.endsWith(suffix) &&
      !h.slice(0, -suffix.length).includes(".") &&
      h.length > suffix.length
    )
  }
  return false
}

export function coversHost(cert: Certificate, host: string): boolean {
  return cert.domains.some((d) => nameCovers(d, host))
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { dateStyle: "medium" })
}
