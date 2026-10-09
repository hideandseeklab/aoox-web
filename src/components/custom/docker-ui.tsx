"use client"

import { Search, type LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { createContext, useContext } from "react"
import { EmptyState } from "@/components/custom/empty-state"
import { Input } from "@/components/ui/input"

/** Returns a function giving a short localized age ("3 hours", "2 days"); null input = "-". */
export function useAgo(): (iso: string | null) => string {
  const t = useTranslations("docker.ago")
  return (iso) => {
    if (!iso) return "-"
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
    if (s < 90) return t("justNow")
    const m = s / 60
    if (m < 90) return t("minutes", { count: Math.round(m) })
    const h = m / 60
    if (h < 36) return t("hours", { count: Math.round(h) })
    const d = h / 24
    if (d < 60) return t("days", { count: Math.round(d) })
    return t("months", { count: Math.round(d / 30) })
  }
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
