import { getLocale, getTranslations } from "next-intl/server"
import Link from "next/link"
import { redirect } from "next/navigation"
import { AcceptInviteForm } from "@/components/custom/accept-invite-form"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { ROLE_LABEL } from "@/features/member/member.entity"
import { getInvitationPreview } from "@/features/member/member.queries"
import { formatDate } from "@/i18n/format"

export async function generateMetadata() {
  const t = await getTranslations("auth.invite")
  return { title: t("metaTitle") }
}

/** Public page reached from the link an owner/admin copied out of Settings. */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  if (await getVerifiedSession()) redirect("/")
  const { token } = await params
  const invite = await getInvitationPreview(token)
  const t = await getTranslations("auth.invite")
  const locale = await getLocale()

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        {invite ? (
          <>
            <CardHeader>
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription>
                {t.rich("description", {
                  role: ROLE_LABEL[invite.role],
                  date: formatDate(invite.expiresAt, locale),
                  b: (c) => <strong>{c}</strong>,
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AcceptInviteForm token={token} email={invite.email} />
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>{t("invalidTitle")}</CardTitle>
              <CardDescription>
                {t("invalidDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/sign-in">{t("toSignIn")}</Link>
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </main>
  )
}
