import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { SetupForm } from "@/components/custom/setup-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { needsSetup } from "@/features/auth/auth.queries"
import { getVerifiedSession } from "@/features/auth/auth.session"

export const metadata = { title: "Setup · aoox" }

export default async function SetupPage() {
  if (await getVerifiedSession()) redirect("/")
  if (!(await needsSetup())) redirect("/sign-in")
  const t = await getTranslations("auth.setup")

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {t("description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SetupForm />
        </CardContent>
      </Card>
    </main>
  )
}
