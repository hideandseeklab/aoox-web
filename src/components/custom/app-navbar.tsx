import { AppBreadcrumb } from "@/components/custom/app-breadcrumb"
import { UserMenu } from "@/components/custom/user-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import type { AuthUser } from "@/features/auth/auth.entity"

export function AppNavbar({ user }: { user: AuthUser }) {
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
      <div className="flex-1" />
      <UserMenu user={user} />
    </header>
  )
}
