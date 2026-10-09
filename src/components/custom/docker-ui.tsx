"use client"

import { Search, type LucideIcon } from "lucide-react"
import { createContext, useContext } from "react"
import { EmptyState } from "@/components/custom/empty-state"
import { Input } from "@/components/ui/input"

/** Short relative age in Indonesian ("3 jam", "2 hari"); null input = "-". */
export function ago(iso: string | null): string {
  if (!iso) return "-"
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 90) return "baru saja"
  const m = s / 60
  if (m < 90) return `${Math.round(m)} menit`
  const h = m / 60
  if (h < 36) return `${Math.round(h)} jam`
  const d = h / 24
  if (d < 60) return `${Math.round(d)} hari`
  return `${Math.round(d / 30)} bulan`
}

/** The toolbar owns the search box (top right, next to the tabs); the tab tables read its text here. */
export const DockerQueryContext = createContext("")
export function useDockerQuery(): string {
  return useContext(DockerQueryContext)
}

/** Case-insensitive match of the search box against any of the given strings. */
export function matches(query: string, ...fields: (string | undefined)[]) {
  const q = query.trim().toLowerCase()
  return !q || fields.some((f) => f?.toLowerCase().includes(q))
}

export function DockerSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="relative w-full">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute start-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="ps-7"
      />
    </div>
  )
}

export function DockerEmpty({
  icon,
  children,
}: {
  icon: LucideIcon
  children: React.ReactNode
}) {
  return <EmptyState icon={icon}>{children}</EmptyState>
}
