import { getTranslations } from "next-intl/server"
import { ExternalRegistries } from "@/components/custom/external-registries"
import { RegistryRepositories } from "@/components/custom/registry-repositories"
import { SelfHostedRegistryCard } from "@/components/custom/self-hosted-registry-card"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { ScrollableTabsList } from "@/components/custom/scrollable-tabs-list"
import { PageTabsTrigger } from "@/components/custom/page-tabs-trigger"
import { Server, Cloud } from "lucide-react"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { listBackupDestinations } from "@/features/backup-destination/backup-destination.queries"
import {
  getSelfHostedStatus,
  listRegistries,
  listRepositories,
} from "@/features/registry/registry.queries"

export const metadata = { title: "Registry · aoox" }

export default async function RegistryPage() {
  const t = await getTranslations("registry.page")
  const [session, status, registries, destinations] = await Promise.all([
    getVerifiedSession(),
    getSelfHostedStatus(),
    listRegistries(),
    listBackupDestinations(),
  ])
  // Same roles that may open the terminal manage registries (owner/admin).
  const canManage = session ? canUseTerminal(session.user) : false
  const selfHosted = status.registry
  const repositories =
    selfHosted && status.container.running
      ? await listRepositories(selfHosted.id).catch(() => null)
      : null
  const external = registries.filter((r) => r.type === "external")

  return (
    <>
      <div>
        <h1 className="text-lg font-semibold">Registry</h1>
        <p className="text-xs text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <Tabs defaultValue="local">
        <ScrollableTabsList>
          <PageTabsTrigger icon={Server} value="local">
            {t("local")}
          </PageTabsTrigger>
          <PageTabsTrigger icon={Cloud} value="external">
            {t("external", { count: external.length })}
          </PageTabsTrigger>
        </ScrollableTabsList>
        <TabsContent value="local" className="space-y-4 pt-4">
          <SelfHostedRegistryCard
            status={status}
            canManage={canManage}
            destinations={destinations}
          />
          {selfHosted && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium">{t("images")}</h2>
              {repositories === null ? (
                <p className="text-xs text-muted-foreground">
                  {t("unreachable")}
                </p>
              ) : (
                <RegistryRepositories
                  registryId={selfHosted.id}
                  repositories={repositories}
                  canManage={canManage}
                />
              )}
            </section>
          )}
        </TabsContent>
        <TabsContent value="external" className="pt-4">
          <ExternalRegistries registries={external} canManage={canManage} />
        </TabsContent>
      </Tabs>
    </>
  )
}
