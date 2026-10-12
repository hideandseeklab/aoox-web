"use client"

import { CircleArrowUp, RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { AuthUser } from "@/features/auth/auth.entity"
import { AUDIT_LOG_NAV, visibleNav } from "./nav-items"
import { UserMenu } from "./user-menu"

export function AppSidebar({
  showTerminal,
  isOwner,
  version,
  update,
  user,
}: {
  /** Signed-in user, for the menu at the foot of the sidebar. */
  user: AuthUser
  showTerminal: boolean
  isOwner: boolean
  /** Running API version from `/auth/me`; absent when unavailable. */
  version?: string
  /** Owner only (from `/auth/me`): a newer aoox is published. */
  update?: { version: string; applying: boolean }
}) {
  const t = useTranslations("nav")
  const webVersion = process.env.NEXT_PUBLIC_WEB_VERSION
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // Owner/admin gate is the same one that shows the terminal.
  const {
    platform: items,
    infra: infraItems,
    integrations: integrationItems,
    settings: settingsItems,
  } = visibleNav({ showTerminal, isOwner })
  const onSettings = pathname === "/settings"
  const currentTab = onSettings ? (searchParams.get("tab") ?? "account") : null

  return (
    <Sidebar collapsible="icon">
      {/* Text only: name and version. Nothing here fits the 32px icon rail, so the
          header is hidden in icon mode; the toggle lives in the top bar. */}
      <SidebarHeader className="group-data-[collapsible=icon]:hidden">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">aoox</span>
                  <span
                    className="truncate font-mono text-xs text-muted-foreground"
                    title={
                      version && webVersion && version !== webVersion
                        ? `API v${version} · Web v${webVersion}`
                        : undefined
                    }
                  >
                    {version && version !== "unknown" ? `v${version}` : "—"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("groups.platform")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={t(item.key)}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{t(item.key)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("groups.infrastructure")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {infraItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                    tooltip={t(item.key)}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{t(item.key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("groups.integrations")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {integrationItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                    tooltip={t(item.key)}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{t(item.key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("groups.settings")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.tab}>
                  <SidebarMenuButton
                    asChild
                    isActive={currentTab === item.tab}
                    tooltip={t(item.key)}
                  >
                    <Link href={`/settings?tab=${item.tab}`}>
                      <item.icon />
                      <span>{t(item.key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {showTerminal && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(AUDIT_LOG_NAV.href)}
                    tooltip={t(AUDIT_LOG_NAV.key)}
                  >
                    <Link href={AUDIT_LOG_NAV.href}>
                      <AUDIT_LOG_NAV.icon />
                      <span>{t(AUDIT_LOG_NAV.key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {update && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                asChild
                isActive={pathname.startsWith("/infra/update")}
                tooltip={
                  update.applying
                    ? t("updating")
                    : t("updateAvailableVersion", { version: update.version })
                }
              >
                <Link href="/infra/update">
                  <span className="relative flex size-8 shrink-0 items-center justify-center">
                    {update.applying ? (
                      <RefreshCw className="size-4 animate-spin" />
                    ) : (
                      <CircleArrowUp className="size-4" />
                    )}
                    {!update.applying && (
                      <span
                        aria-hidden
                        className="absolute top-0.5 right-0.5 size-2 rounded-full bg-primary ring-2 ring-sidebar"
                      />
                    )}
                  </span>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {update.applying ? t("updating") : t("updateAvailable")}
                    </span>
                    <span className="truncate font-mono text-xs text-muted-foreground">
                      v{update.version}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        <UserMenu user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
