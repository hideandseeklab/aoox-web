import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AppNavbar } from "@/components/custom/app-navbar"
import { AppSidebar } from "@/components/custom/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getVerifiedSession()
  if (!session) redirect("/sign-in")

  // shadcn sidebar persists open/closed state in this cookie.
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        showTerminal={canUseTerminal(session.user)}
        isOwner={session.user.role === "owner"}
      />
      <SidebarInset>
        <AppNavbar user={session.user} />
        <div className="flex flex-1 flex-col gap-6 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
