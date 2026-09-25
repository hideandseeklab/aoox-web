import Link from "next/link"
import { HostLiveChart } from "@/components/custom/host-live-chart"
import { LiveClock } from "@/components/custom/live-clock"
import { HostOverviewCard } from "@/components/custom/host-overview-card"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  // Owner/admin only; Docker being unreachable must not break the dashboard.
  const [host, live] = canUseTerminal(user)
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
          <p className="text-sm text-muted-foreground">
            Ringkasan platform kamu.
          </p>
        </div>
        <LiveClock />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total project</CardDescription>
            <CardTitle className="text-3xl">{total}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/projects">Lihat semua</Link>
            </Button>
          </CardContent>
        </Card>
        {/* Status tints: green = running, red = nothing running; the label
            carries the meaning too, colour is reinforcement only. */}
        <Card className="border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10">
          <CardHeader>
            <CardDescription className="text-emerald-700 dark:text-emerald-400">
              Project aktif
            </CardDescription>
            <CardTitle className="text-3xl text-emerald-700 dark:text-emerald-400">
              {active}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Ada aplikasi, database, atau stack compose yang berjalan.
          </CardContent>
        </Card>
        <Card className="border-red-500/40 bg-red-500/5 dark:bg-red-500/10">
          <CardHeader>
            <CardDescription className="text-red-700 dark:text-red-400">
              Project tidak aktif
            </CardDescription>
            <CardTitle className="text-3xl text-red-700 dark:text-red-400">
              {total - active}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Semua berhenti/error, atau belum ada yang di-deploy.
          </CardContent>
        </Card>
        {host && <HostOverviewCard host={host} />}
      </div>

      {live && <HostLiveChart initial={live} />}
    </>
  )
}
