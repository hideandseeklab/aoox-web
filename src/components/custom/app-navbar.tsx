import { AppBreadcrumb } from "@/components/custom/app-breadcrumb"
import { CommandPalette } from "@/components/custom/command-palette"
import { InboxBell } from "@/components/custom/inbox-bell"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function AppNavbar({
  showTerminal,
  isOwner,
}: {
  showTerminal: boolean
  isOwner: boolean
}) {
  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ms-1" />
      {/* The ui Separator stretches vertically (`self-stretch`) by default;
          a fixed height keeps it centred between trigger and crumbs. */}
      <Separator
        orientation="vertical"
        className="me-1 data-vertical:h-4 data-vertical:self-center"
      />
      <AppBreadcrumb />
      <div className="ms-auto flex items-center gap-2">
        <CommandPalette showTerminal={showTerminal} isOwner={isOwner} />
        <InboxBell />
      </div>
    </header>
  )
}
