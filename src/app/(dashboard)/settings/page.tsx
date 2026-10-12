import { LinkArrow } from "@/components/custom/arrows"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { AccountCard } from "@/components/custom/account-card"
import { ApiTokensCard } from "@/components/custom/api-tokens-card"
import { MembersCard } from "@/components/custom/members-card"
import { Button } from "@/components/ui/button"
import { SettingsTabs } from "@/components/custom/settings-tabs"
import { TabsContent } from "@/components/ui/tabs"
import { listApiTokens } from "@/features/api-token/api-token.queries"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { listInvitations, listMembers } from "@/features/member/member.queries"
import { listProjects } from "@/features/project/project.queries"
import { publicApiUrl, webOrigin } from "@/lib/api"

export const metadata = { title: "Settings · aoox" }

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  // The old Integrations tab moved to its own sidebar group.
  if ((await searchParams).tab === "integrations") redirect("/integrations/git")
  const t = await getTranslations("settings")
  const [session, apiTokens, projects] = await Promise.all([
    getVerifiedSession(),
    listApiTokens(),
    // Only to offer a project scope when creating a token.
    listProjects(),
  ])
  const canManage = session ? canUseTerminal(session.user) : false
  // These endpoints are owner/admin only; members just don't get the card.
  const [members, invitations] = canManage
    ? await Promise.all([listMembers(), listInvitations()])
    : [null, null]

  return (
    <>
      <div>
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <p className="text-xs text-muted-foreground">{t("description")}</p>
      </div>

      {/* Grouped by what the cards are about; `?tab=` deep-links a group. */}
      <SettingsTabs
        tabs={[
          { value: "account", label: t("tabs.account") },
          ...(canManage
            ? [{ value: "team" as const, label: t("tabs.team") }]
            : []),
        ]}
      >
        <TabsContent value="account" className="pt-4">
          <div className="@container">
            <div className="grid gap-4 @3xl:grid-cols-2 @3xl:[&>*:last-child:nth-child(odd)]:col-span-2">
              {session && <AccountCard me={session.user} />}
              <ApiTokensCard
                tokens={apiTokens}
                publicApiUrl={publicApiUrl()}
                webOrigin={webOrigin()}
                projects={projects.map((p) => ({ id: p.id, name: p.name }))}
              />
            </div>
          </div>
        </TabsContent>

        {canManage && (
          <TabsContent value="team" className="space-y-4 pt-4">
            {session && members && invitations && (
              <MembersCard
                me={session.user}
                members={members}
                invitations={invitations}
              />
            )}
            <Button asChild variant="link" size="sm" className="px-0">
              <Link href="/settings/audit-log">
                {t("viewAuditLog")}
                <LinkArrow />
              </Link>
            </Button>
          </TabsContent>
        )}
      </SettingsTabs>
    </>
  )
}
