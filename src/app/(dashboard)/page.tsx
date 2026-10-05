import { Activity, FolderKanban, PowerOff } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"
import { HostLiveChart } from "@/components/custom/host-live-chart"
import { LiveClock } from "@/components/custom/live-clock"
import { RecentActivitySection } from "@/components/custom/recent-activity-section"
import { HostOverviewCard } from "@/components/custom/host-overview-card"
import { StatCard } from "@/components/custom/stat-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import {
  getHostLive,
  getHostOverview,
} from "@/features/monitoring/monitoring.queries"
import {
  getProjectSummary,
  listProjects,
} from "@/features/project/project.queries"

export const metadata = { title: "Dashboard · aoox" }

export default async function DashboardPage() {
  const [session, projects, summary] = await Promise.all([
    getVerifiedSession(),
    listProjects(),
    getProjectSummary().catch(() => null),
  ])
  const total = summary?.total ?? projects.length
  const active = summary?.active ?? 0
  const user = session!.user
  const isAdmin = canUseTerminal(user)
  // Owner/admin only; Docker being unreachable must not break the dashboard.
  const [host, live] = isAdmin
    ? await Promise.all([
        getHostOverview().catch(() => null),
        getHostLive().catch(() => null),
      ])
    : [null, null]

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">
            Halo, {user.name ?? user.email}
          </h1>
          <p className="text-xs text-muted-foreground">
            Ringkasan platform kamu.
          </p>
        </div>
        <LiveClock />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={FolderKanban}
          label="Total project"
          value={total}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/projects">Lihat semua</Link>
            </Button>
          }
        />
        {/* Status tints: green = running, red = nothing running; the label
            carries the meaning too, colour is reinforcement only. */}
        <StatCard
          tone="success"
          icon={Activity}
          label="Project aktif"
          value={active}
          hint="Ada aplikasi, database, atau stack compose yang berjalan."
        />
        <StatCard
          tone="danger"
          icon={PowerOff}
          label="Project tidak aktif"
          value={total - active}
          hint="Semua berhenti/error, atau belum ada yang di-deploy."
        />
        {host && <HostOverviewCard host={host} />}
      </div>

      {live && <HostLiveChart initial={live} />}

      {/* Owner/admin only (the audit log API refuses everyone else); streamed so the
          rest of the dashboard does not wait for it. */}
      {isAdmin && (
        <Suspense fallback={<Skeleton className="h-72" />}>
          <RecentActivitySection />
        </Suspense>
      )}
    </>
  )
}
