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
 * palette searches it. Labels live in the message files under `nav.<key>`. The flags are the same gates as before: `terminal` and
 * `manage` = the owner/admin gate (the one that shows the terminal), `owner` = owner only.
 */
export interface NavItem {
  /** Key under `nav` in the message files. */
  key: string
  href: string
  icon: LucideIcon
  exact?: boolean
  terminal?: boolean
  manage?: boolean
  owner?: boolean
}

export const NAV: NavItem[] = [
  { key: "dashboard", href: "/", icon: LayoutDashboard, exact: true },
  { key: "projects", href: "/projects", icon: FolderKanban },
  { key: "templates", href: "/templates", icon: LayoutTemplate },
  { key: "registry", href: "/registry", icon: Container },
  // `terminal` = the owner/admin gate (same one that shows the terminal).
  { key: "docker", href: "/infra/docker", icon: Boxes, terminal: true },
  {
    key: "terminal",
    href: "/terminal",
    icon: TerminalSquare,
    terminal: true,
  },
]

/** One page per host component under `/infra/*` (see `app/(dashboard)/infra`). */
export const INFRA_NAV: NavItem[] = [
  { key: "reverseProxy", href: "/infra/proxy", icon: Waypoints },
  {
    key: "remoteServers",
    href: "/infra/servers",
    icon: Server,
    manage: true,
  },
  { key: "sshKey", href: "/infra/terminal", icon: KeyRound, manage: true },
  { key: "dockerSwarm", href: "/infra/swarm", icon: Workflow, manage: true },
  { key: "dockerDisk", href: "/infra/disk", icon: HardDrive, manage: true },
  {
    key: "instanceBackup",
    href: "/infra/backup",
    icon: DatabaseBackup,
    owner: true,
  },
  {
    key: "panelDomain",
    href: "/infra/domain",
    icon: Globe,
    owner: true,
  },
  {
    key: "updateAoox",
    href: "/infra/update",
    icon: RefreshCw,
    owner: true,
  },
  {
    key: "environment",
    href: "/infra/environment",
    icon: Settings2,
    owner: true,
  },
]

/** The Settings tabs, one entry each, so a group in the sidebar mirrors the page. */
export const SETTINGS_NAV: {
  key: string
  tab: string
  icon: LucideIcon
  manage?: boolean
}[] = [
  { key: "account", tab: "account", icon: UserRound },
  { key: "team", tab: "team", icon: Users, manage: true },
  { key: "integrations", tab: "integrations", icon: Plug },
]

/** Settings page with its own route; shown only behind the owner/admin gate. */
export const AUDIT_LOG_NAV = {
  key: "auditLog",
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
