import {
  Boxes,
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
  type LucideIcon,
} from "lucide-react"

/**
 * The one definition of the navigation: the sidebar renders it and the command
 * palette searches it. The flags are the same gates as before: `terminal` and
 * `manage` = the owner/admin gate (the one that shows the terminal), `owner` = owner only.
 */
export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  exact?: boolean
  terminal?: boolean
  manage?: boolean
  owner?: boolean
}

export const NAV: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard, exact: true },
  { title: "Projects", href: "/projects", icon: FolderKanban },
  { title: "Templates", href: "/templates", icon: LayoutTemplate },
  { title: "Registry", href: "/registry", icon: Container },
  // `terminal` = the owner/admin gate (same one that shows the terminal).
  { title: "Docker", href: "/infra/docker", icon: Boxes, terminal: true },
  {
    title: "Terminal",
    href: "/terminal",
    icon: TerminalSquare,
    terminal: true,
  },
]

/** One page per host component under `/infra/*` (see `app/(dashboard)/infra`). */
export const INFRA_NAV: NavItem[] = [
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
export const SETTINGS_NAV: {
  title: string
  tab: string
  icon: LucideIcon
  manage?: boolean
}[] = [
  { title: "Akun", tab: "account", icon: UserRound },
  { title: "Tim", tab: "team", icon: Users, manage: true },
  { title: "Integrasi", tab: "integrations", icon: Plug },
]

/** Settings page with its own route; shown only behind the owner/admin gate. */
export const AUDIT_LOG_NAV = {
  title: "Audit log",
  href: "/settings/audit-log",
  icon: ScrollText,
}

/** What the signed-in user may see, by the same rules the sidebar always used. */
export function visibleNav({
  showTerminal,
  isOwner,
}: {
  showTerminal: boolean
  isOwner: boolean
}) {
  return {
    platform: NAV.filter((item) => !item.terminal || showTerminal),
    infra: INFRA_NAV.filter(
      (item) => (!item.manage || showTerminal) && (!item.owner || isOwner)
    ),
    settings: SETTINGS_NAV.filter((item) => !item.manage || showTerminal),
    auditLog: showTerminal,
  }
}
