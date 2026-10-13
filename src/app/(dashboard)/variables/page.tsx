import { getTranslations } from "next-intl/server"
import { CreateVariableSetDialog } from "@/components/custom/create-variable-set-dialog"
import { IllustratedEmptyState } from "@/components/custom/illustrated-empty-state"
import { VariablesIllustration } from "@/components/custom/illustrations/variables-illustration"
import { VariableSetCard } from "@/components/custom/variable-set-card"
import { canUseTerminal } from "@/features/auth/auth.entity"
import { getVerifiedSession } from "@/features/auth/auth.session"
import { listProjects } from "@/features/project/project.queries"
import { listVariableSets } from "@/features/variable-set/variable-set.queries"

export async function generateMetadata() {
  const t = await getTranslations("variables")
  return { title: t("meta.title") }
}

export default async function VariablesPage() {
  const t = await getTranslations("variables")
  const session = await getVerifiedSession()
  // Creating a set is for instance owners/admins (the API enforces it too).
  const canCreate = session ? canUseTerminal(session.user) : false
  const [sets, projects] = await Promise.all([
    listVariableSets(),
    canCreate ? listProjects().catch(() => []) : Promise.resolve([]),
  ])
  const projectOptions = projects
    .map((p) => ({ id: p.id, name: p.name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">{t("list.title")}</h1>
          <p className="text-xs text-muted-foreground">{t("list.subtitle")}</p>
        </div>
        {canCreate && sets.length > 0 && (
          <CreateVariableSetDialog projects={projectOptions} />
        )}
      </div>

      {sets.length === 0 ? (
        <IllustratedEmptyState
          illustration={<VariablesIllustration />}
          title={t("list.emptyTitle")}
          description={
            canCreate ? t("list.emptyBody") : t("list.emptyBodyMember")
          }
          actions={
            canCreate ? (
              <CreateVariableSetDialog projects={projectOptions} />
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((s) => (
            <VariableSetCard key={s.id} set={s} />
          ))}
        </div>
      )}
    </>
  )
}
