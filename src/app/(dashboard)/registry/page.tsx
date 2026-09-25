import { ExternalRegistries } from "@/components/custom/external-registries"
import { RegistryRepositories } from "@/components/custom/registry-repositories"
import { SelfHostedRegistryCard } from "@/components/custom/self-hosted-registry-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import {
  getSelfHostedStatus,
  listRegistries,
  listRepositories,
} from "@/features/registry/registry.queries"

export const metadata = { title: "Registry · aoox" }

export default async function RegistryPage() {
  const [session, status, registries] = await Promise.all([
    getVerifiedSession(),
    getSelfHostedStatus(),
    listRegistries(),
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
        <p className="text-sm text-muted-foreground">
          Tempat image hasil build disimpan — untuk rollback dan deploy ke
          banyak server.
        </p>
      </div>

      <Tabs defaultValue="local">
        <TabsList>
          <TabsTrigger value="local">Registry lokal</TabsTrigger>
          <TabsTrigger value="external">
            Eksternal ({external.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="local" className="space-y-4 pt-4">
          <SelfHostedRegistryCard status={status} canManage={canManage} />
          {selfHosted && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium">Image</h2>
              {repositories === null ? (
                <p className="text-sm text-muted-foreground">
                  Registry tidak dapat dihubungi.
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
