import { Activity, FolderKanban, PowerOff } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { Suspense } from "react"
import { HostLiveChart } from "@/components/custom/host-live-chart"
import { LiveClock } from "@/components/custom/live-clock"
import { OnboardingChecklist } from "@/components/custom/onboarding-checklist"
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
import { getOnboarding } from "@/features/onboarding/onboarding.queries"
import {
  getProjectSummary,
  listProjects,
} from "@/features/project/project.queries"

export async function generateMetadata() {
  const t = await getTranslations("dashboard")
  return { title: t("metaTitle") }
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard")
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
  // Owner only; the API answers visible:false for everyone else anyway.
  const onboarding =
    user.role === "owner" ? await getOnboarding().catch(() => null) : null

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">
            {t("greeting", { name: user.name ?? user.email })}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <LiveClock />
      </div>

      {onboarding?.visible && <OnboardingChecklist onboarding={onboarding} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={FolderKanban}
          label={t("stats.totalProjects")}
          value={total}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/projects">{t("stats.viewAll")}</Link>
            </Button>
          }
        />
        {/* Status tints: green = running, red = nothing running; the label
            carries the meaning too, colour is reinforcement only. */}
        <StatCard
          tone="success"
          icon={Activity}
          label={t("stats.activeProjects")}
          value={active}
          hint={t("stats.activeHint")}
        />
        <StatCard
          tone="danger"
          icon={PowerOff}
          label={t("stats.inactiveProjects")}
          value={total - active}
          hint={t("stats.inactiveHint")}
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
