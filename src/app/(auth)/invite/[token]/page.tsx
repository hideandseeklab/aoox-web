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

export const metadata = { title: "Undangan · aoox" }

/** Public page reached from the link an owner/admin copied out of Settings. */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  if (await getVerifiedSession()) redirect("/")
  const { token } = await params
  const invite = await getInvitationPreview(token)

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        {invite ? (
          <>
            <CardHeader>
              <CardTitle>Bergabung ke aoox</CardTitle>
              <CardDescription>
                Kamu diundang sebagai <strong>{ROLE_LABEL[invite.role]}</strong>
                . Undangan berlaku sampai{" "}
                {new Date(invite.expiresAt).toLocaleDateString()}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AcceptInviteForm token={token} email={invite.email} />
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Undangan tidak berlaku</CardTitle>
              <CardDescription>
                Link ini tidak dikenal, sudah dipakai, atau kedaluwarsa. Minta
                undangan baru ke admin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/sign-in">Ke halaman sign in</Link>
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </main>
  )
}
