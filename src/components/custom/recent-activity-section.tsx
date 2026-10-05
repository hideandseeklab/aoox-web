import { RecentActivityCard } from "@/components/custom/recent-activity-card"
import { fetchRecentActivityAction } from "@/features/audit-log/audit-log.actions"

/** Server wrapper: loads the first page so the card can sit inside a Suspense boundary. */
export async function RecentActivitySection() {
  const initial = await fetchRecentActivityAction()
  return <RecentActivityCard initial={initial} />
}
