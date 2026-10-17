import { getTranslations } from "next-intl/server"
import {
  AddCredentialDialog,
  GitCredentialsCard,
} from "@/components/custom/git-credentials-card"
import { IllustratedEmptyState } from "@/components/custom/illustrated-empty-state"
import { GitCredentialsIllustration } from "@/components/custom/illustrations/git-credentials-illustration"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { listGitCredentials } from "@/features/git-credential/git-credential.queries"
import { IntegrationPage } from "../integration-page"

export async function generateMetadata() {
  const t = await getTranslations("integrations.pages.git")
  return { title: t("metadata") }
}

export default async function GitCredentialsPage() {
  const t = await getTranslations("integrations.pages.git")
  const [session, credentials] = await Promise.all([
    getVerifiedSession(),
    listGitCredentials(),
  ])
  // Every member sees the list; only owner/admin can add or delete.
  const canManage = session ? canUseTerminal(session.user) : false
  return (
    <IntegrationPage title={t("title")} description={t("description")}>
      {credentials.length === 0 ? (
        <IllustratedEmptyState
          illustration={<GitCredentialsIllustration />}
          title={t("emptyTitle")}
          description={canManage ? t("emptyBody") : t("emptyBodyMember")}
          actions={
            canManage ? <AddCredentialDialog size="default" /> : undefined
          }
        />
      ) : (
        <GitCredentialsCard credentials={credentials} canManage={canManage} />
      )}
    </IntegrationPage>
  )
}
