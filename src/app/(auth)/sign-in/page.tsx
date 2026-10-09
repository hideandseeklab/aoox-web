import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { SignInForm } from "@/components/custom/sign-in-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { needsSetup } from "@/features/auth/auth.queries"
import { getVerifiedSession } from "@/features/auth/auth.session"

export const metadata = { title: "Sign in · aoox" }

export default async function SignInPage() {
  if (await getVerifiedSession()) redirect("/")
  if (await needsSetup()) redirect("/setup")
  const t = await getTranslations("auth.signIn")

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm />
        </CardContent>
      </Card>
    </main>
  )
}
