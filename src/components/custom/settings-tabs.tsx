"use client"

import { useTranslations } from "next-intl"
import { usePathname, useSearchParams } from "next/navigation"
import { useRouter } from "@/lib/use-router"
import { Tabs, TabsTrigger } from "@/components/ui/tabs"
import { ScrollableTabsList } from "@/components/custom/scrollable-tabs-list"
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
  const t = useTranslations("settings")
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const raw = params.get("tab")
  const value: SettingsTab = SETTINGS_TABS.includes(raw as SettingsTab)
    ? (raw as SettingsTab)
    : "account"

  const label = tabs.find((tab) => tab.value === value)?.label ?? value
  return (
    <Tabs
      value={value}
      onValueChange={(v) => router.replace(`${pathname}?tab=${v}`)}
    >
      <SetBreadcrumb
        items={[{ label: t("title"), href: "/settings" }, { label }]}
      />
      <ScrollableTabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </ScrollableTabsList>
      {children}
    </Tabs>
  )
}
