"use client"

import {
  CircleArrowUp,
  Container,
  DatabaseBackup,
  FolderKanban,
  Globe,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  Plug,
  RefreshCw,
  ScrollText,
  Server,
  Settings2,
  TerminalSquare,
  UserRound,
  Users,
  Waypoints,
  Workflow,
} from "lucide-react"
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
import { BrandLogo } from "./brand-logo"

const NAV = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard, exact: true },
  { title: "Projects", href: "/projects", icon: FolderKanban },
  { title: "Templates", href: "/templates", icon: LayoutTemplate },
  { title: "Registry", href: "/registry", icon: Container },
  {
    title: "Terminal",
    href: "/terminal",
    icon: TerminalSquare,
    terminal: true,
  },
]

/** One page per host component under `/infra/*` (see `app/(dashboard)/infra`). */
const INFRA_NAV = [
  { title: "Reverse proxy", href: "/infra/proxy", icon: Waypoints },
  {
    title: "Server remote",
    href: "/infra/servers",
    icon: Server,
    manage: true,
  },
  { title: "Terminal", href: "/infra/terminal", icon: KeyRound, manage: true },
  { title: "Docker Swarm", href: "/infra/swarm", icon: Workflow, manage: true },
  { title: "Disk Docker", href: "/infra/disk", icon: HardDrive, manage: true },
  {
    title: "Backup instance",
    href: "/infra/backup",
    icon: DatabaseBackup,
    owner: true,
  },
  {
    title: "Domain panel",
    href: "/infra/domain",
    icon: Globe,
    owner: true,
  },
  {
    title: "Update aoox",
    href: "/infra/update",
    icon: RefreshCw,
    owner: true,
  },
  {
    title: "Environment",
    href: "/infra/environment",
    icon: Settings2,
    owner: true,
  },
]

/** The Settings tabs, one entry each, so a group in the sidebar mirrors the page. */
const SETTINGS_NAV = [
  { title: "Akun", tab: "account", icon: UserRound },
  { title: "Tim", tab: "team", icon: Users, manage: true },
  { title: "Integrasi", tab: "integrations", icon: Plug },
]

export function AppSidebar({
  showTerminal,
  isOwner,
  version,
  update,
}: {
  showTerminal: boolean
  isOwner: boolean
  /** Running API version from `/auth/me`; absent when unavailable. */
  version?: string
  /** Owner only (from `/auth/me`): a newer aoox is published. */
  update?: { version: string; applying: boolean }
}) {
  const webVersion = process.env.NEXT_PUBLIC_WEB_VERSION
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const items = NAV.filter((item) => !item.terminal || showTerminal)
  // Owner/admin gate is the same one that shows the terminal.
  const infraItems = INFRA_NAV.filter(
    (item) => (!item.manage || showTerminal) && (!item.owner || isOwner)
  )
  const settingsItems = SETTINGS_NAV.filter(
    (item) => !item.manage || showTerminal
  )
  const onSettings = pathname === "/settings"
  const currentTab = onSettings ? (searchParams.get("tab") ?? "account") : null

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <BrandLogo />
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
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
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
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Infrastruktur</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {infraItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.tab}>
                  <SidebarMenuButton
                    asChild
                    isActive={currentTab === item.tab}
                    tooltip={item.title}
                  >
                    <Link href={`/settings?tab=${item.tab}`}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {showTerminal && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/settings/audit-log")}
                    tooltip="Audit log"
                  >
                    <Link href="/settings/audit-log">
                      <ScrollText />
                      <span>Audit log</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {update && (
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                asChild
                isActive={pathname.startsWith("/infra/update")}
                tooltip={
                  update.applying
                    ? "Sedang memperbarui…"
                    : `Update tersedia: v${update.version}`
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
                      {update.applying
                        ? "Sedang memperbarui…"
                        : "Update tersedia"}
                    </span>
                    <span className="truncate font-mono text-xs text-muted-foreground">
                      v{update.version}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  )
}
