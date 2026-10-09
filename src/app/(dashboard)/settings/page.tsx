import { LinkArrow } from "@/components/custom/arrows"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { AccountCard } from "@/components/custom/account-card"
import { ApiTokensCard } from "@/components/custom/api-tokens-card"
import { BackupDestinationsCard } from "@/components/custom/backup-destinations-card"
import { GitCredentialsCard } from "@/components/custom/git-credentials-card"
import { SecretConnectionsCard } from "@/components/custom/secret-connections-card"
import { CertificatesCard } from "@/components/custom/certificates-card"
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
import { listCertificates } from "@/features/certificate/certificate.queries"
import { listSecretConnections } from "@/features/secret-connection/secret-connection.queries"
import { publicApiUrl } from "@/lib/api"

export const metadata = { title: "Settings · aoox" }

export default async function SettingsPage() {
  const t = await getTranslations("settings")
  const [session, credentials, apiTokens, projects] = await Promise.all([
    getVerifiedSession(),
    listGitCredentials(),
    listApiTokens(),
    // Only to offer a project scope when creating a token.
    listProjects(),
  ])
  const canManage = session ? canUseTerminal(session.user) : false
  // These endpoints are owner/admin only; members just don't get the cards.
  const [
    notifications,
    members,
    invitations,
    destinations,
    secretConnections,
    certificates,
  ] = canManage
    ? await Promise.all([
        listNotifications(),
        listMembers(),
        listInvitations(),
        listBackupDestinations(),
        // An older API without the secret manager answers 404: no card then.
        listSecretConnections().catch(() => null),
        // Same for certificates: an API without them just hides the card.
        listCertificates().catch(() => null),
      ])
    : [null, null, null, null, null, null]

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
          { value: "integrations", label: t("tabs.integrations") },
        ]}
      >
        <TabsContent value="account" className="pt-4">
          <div className="@container">
            <div className="grid gap-4 @3xl:grid-cols-2 @3xl:[&>*:last-child:nth-child(odd)]:col-span-2">
              {session && <AccountCard me={session.user} />}
              <ApiTokensCard
                tokens={apiTokens}
                publicApiUrl={publicApiUrl()}
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

        <TabsContent value="integrations" className="pt-4">
          <div className="@container">
            <div className="grid gap-4 @3xl:grid-cols-2 @3xl:[&>*:last-child:nth-child(odd)]:col-span-2">
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
              {secretConnections && (
                <SecretConnectionsCard connections={secretConnections} />
              )}
              {certificates && <CertificatesCard certificates={certificates} />}
            </div>
          </div>
        </TabsContent>
      </SettingsTabs>
    </>
  )
}
