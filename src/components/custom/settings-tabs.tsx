"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SetBreadcrumb } from "./breadcrumb-store"

export const SETTINGS_TABS = ["account", "team", "integrations"] as const
export type SettingsTab = (typeof SETTINGS_TABS)[number]

/**
 * Controlled tabs whose value lives in `?tab=`, so the sidebar's Settings
 * group, deep links and the tab strip all agree on what is open.
 */
export function SettingsTabs({
  tabs,
  children,
}: {
  tabs: { value: SettingsTab; label: string }[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const raw = params.get("tab")
  const value: SettingsTab = SETTINGS_TABS.includes(raw as SettingsTab)
    ? (raw as SettingsTab)
    : "account"

  const label = tabs.find((t) => t.value === value)?.label ?? value
  return (
    <Tabs
      value={value}
      onValueChange={(v) => router.replace(`${pathname}?tab=${v}`)}
    >
      <SetBreadcrumb
        items={[{ label: "Settings", href: "/settings" }, { label }]}
      />
      <TabsList>
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  )
}
