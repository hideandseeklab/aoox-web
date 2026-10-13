import { getTranslations } from "next-intl/server"
import { Suspense } from "react"
import { DashboardOverviewCard } from "@/components/custom/dashboard-overview-card"
import { HostLiveChart } from "@/components/custom/host-live-chart"
import { LiveClock } from "@/components/custom/live-clock"
import { OnboardingChecklist } from "@/components/custom/onboarding-checklist"
import { RecentActivitySection } from "@/components/custom/recent-activity-section"
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

      <DashboardOverviewCard
        total={total}
        active={active}
        host={host}
        hostUnavailable={isAdmin && !host}
      />

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
