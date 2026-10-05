"use client"

import { LogOut, User as UserIcon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { signOutAction } from "@/features/auth/auth.actions"
import type { AuthUser } from "@/features/auth/auth.entity"

function initials(user: AuthUser) {
  const source = user.name?.trim() || user.email
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("")
}

/**
 * The signed-in user's menu, at the foot of the sidebar. Collapsed to the icon rail it shows only
 * the avatar (the name is the tooltip) and opens beside the rail instead of above the button.
 */
export function UserMenu({ user }: { user: AuthUser }) {
  const { isMobile, state } = useSidebar()
  const label = user.name ?? user.email

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/* p-1 in icon mode: the stock button forces p-2 there, which would leave an
                8px-wide box for the 24px avatar and clip it. */}
            <SidebarMenuButton
              tooltip={label}
              className="group-data-[collapsible=icon]:p-1!"
            >
              <Avatar className="size-6">
                <AvatarFallback className="text-[10px]">
                  {initials(user)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{label}</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile || state === "expanded" ? "top" : "right"}
            align={isMobile || state === "expanded" ? "start" : "end"}
            className="w-56"
          >
            <DropdownMenuLabel className="font-normal">
              <div className="grid gap-0.5">
                <span className="truncate text-sm font-medium">
                  {user.name ?? "—"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <UserIcon />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void signOutAction()}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
