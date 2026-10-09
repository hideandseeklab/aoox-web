import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function DashboardNotFound() {
  const t = await getTranslations("dashboard.notFound")
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
      <p className="text-sm font-medium">{t("title")}</p>
      <p className="text-xs text-muted-foreground">
        {t("description")}
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/">{t("back")}</Link>
      </Button>
    </div>
  )
}
