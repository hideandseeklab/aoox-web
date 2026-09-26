"use client"

import {
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
}: {
  showTerminal: boolean
  isOwner: boolean
}) {
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
                  <span className="truncate text-xs text-muted-foreground">
                    self-hosted PaaS
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
      <SidebarRail />
    </Sidebar>
  )
}
