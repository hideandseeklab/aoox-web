import Link from "next/link"
import { AccountCard } from "@/components/custom/account-card"
import { ApiTokensCard } from "@/components/custom/api-tokens-card"
import { BackupDestinationsCard } from "@/components/custom/backup-destinations-card"
import { GitCredentialsCard } from "@/components/custom/git-credentials-card"
import { MembersCard } from "@/components/custom/members-card"
import { NotificationsCard } from "@/components/custom/notifications-card"
import { Button } from "@/components/ui/button"
import { SettingsTabs } from "@/components/custom/settings-tabs"
import { TabsContent } from "@/components/ui/tabs"
import { listApiTokens } from "@/features/api-token/api-token.queries"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { listBackupDestinations } from "@/features/backup-destination/backup-destination.queries"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { listGitCredentials } from "@/features/git-credential/git-credential.queries"
import { listInvitations, listMembers } from "@/features/member/member.queries"
import { listNotifications } from "@/features/notification/notification.queries"
import { listProjects } from "@/features/project/project.queries"
import { publicApiUrl } from "@/lib/api"

export const metadata = { title: "Settings · aoox" }

export default async function SettingsPage() {
  const [session, credentials, apiTokens, projects] = await Promise.all([
    getVerifiedSession(),
    listGitCredentials(),
    listApiTokens(),
    // Only to offer a project scope when creating a token.
    listProjects(),
  ])
  const canManage = session ? canUseTerminal(session.user) : false
  // These endpoints are owner/admin only; members just don't get the cards.
  const [notifications, members, invitations, destinations] = canManage
    ? await Promise.all([
        listNotifications(),
        listMembers(),
        listInvitations(),
        listBackupDestinations(),
      ])
    : [null, null, null, null]

  return (
    <>
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Akun, tim, dan integrasi. Komponen host (proxy, server, swarm, disk)
          ada di grup Infrastruktur.
        </p>
      </div>

      {/* Grouped by what the cards are about; `?tab=` deep-links a group. */}
      <SettingsTabs
        tabs={[
          { value: "account", label: "Akun" },
          ...(canManage ? [{ value: "team" as const, label: "Tim" }] : []),
          { value: "integrations", label: "Integrasi" },
        ]}
      >
        <TabsContent value="account" className="pt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {session && <AccountCard me={session.user} />}
            <ApiTokensCard
              tokens={apiTokens}
              publicApiUrl={publicApiUrl()}
              projects={projects.map((p) => ({ id: p.id, name: p.name }))}
            />
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
              <Link href="/settings/audit-log">Lihat audit log →</Link>
            </Button>
          </TabsContent>
        )}

        <TabsContent value="integrations" className="pt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <GitCredentialsCard
              credentials={credentials}
              canManage={canManage}
            />
            {notifications && (
              <NotificationsCard notifications={notifications} />
            )}
            {destinations && (
              <BackupDestinationsCard destinations={destinations} />
            )}
          </div>
        </TabsContent>
      </SettingsTabs>
    </>
  )
}
