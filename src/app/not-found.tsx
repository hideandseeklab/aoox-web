import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { IllustratedEmptyState } from "@/components/custom/illustrated-empty-state"
import { NotFoundIllustration } from "@/components/custom/illustrations/not-found-illustration"
import { Button } from "@/components/ui/button"

// Root fallback for addresses that never reach the dashboard layout. The root
// layout already provides the theme and the intl provider.
export default async function RootNotFound() {
  const t = await getTranslations("dashboard.notFound")
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground">
      <IllustratedEmptyState
        illustration={<NotFoundIllustration />}
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild>
            <Link href="/">{t("back")}</Link>
          </Button>
        }
      />
    </main>
  )
}
