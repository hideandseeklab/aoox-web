import { ChevronRight, Lock, Variable } from "lucide-react"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { EmptyState } from "@/components/custom/empty-state"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ProjectVariableSet } from "@/features/variable-set/variable-set.entity"

/**
 * Right column of the project page: the variable sets shared with this
 * project, their environments, and which of its applications and stacks link
 * each environment. Names only; values live on the set page.
 */
export async function ProjectVariableSets({
  sets,
}: {
  sets: ProjectVariableSet[]
}) {
  const t = await getTranslations("variables.project")

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {sets.length === 0 ? (
          <EmptyState icon={Variable} compact>
            {t.rich("empty", {
              link: (chunks) => (
                <Link
                  href="/variables"
                  className="text-foreground underline underline-offset-4"
                >
                  {chunks}
                </Link>
              ),
            })}
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {sets.map((s) => (
              <li key={s.id} className="rounded-md border text-xs">
                <Link
                  href={`/variables/${s.id}`}
                  className="flex items-center gap-2 border-b px-3 py-2 hover:bg-muted/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{s.name}</span>
                    <span className="block truncate font-mono text-muted-foreground">
                      {s.slug}
                    </span>
                  </span>
                  {s.sharedWithAll && (
                    <Badge variant="outline" className="shrink-0">
                      {t("allProjects")}
                    </Badge>
                  )}
                  <ChevronRight
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="sr-only">{t("open", { name: s.name })}</span>
                </Link>
                <ul className="divide-y">
                  {s.environments.map((e) => {
                    const users = s.usedBy.filter(
                      (u) => u.environmentId === e.id
                    )
                    return (
                      <li
                        key={e.id}
                        className="flex items-start gap-3 px-3 py-1.5"
                      >
                        <span className="flex w-28 shrink-0 items-center gap-1 font-mono">
                          {e.protected && (
                            <Lock
                              className="size-3 shrink-0 text-muted-foreground"
                              aria-label={t("protected")}
                            />
                          )}
                          <span className="truncate">{e.name}</span>
                        </span>
                        <span className="min-w-0 flex-1 text-end">
                          {users.length === 0 ? (
                            <span className="text-muted-foreground">
                              {t("unused")}
                            </span>
                          ) : (
                            users.map((u, i) => (
                              <span key={`${u.kind}-${u.id}`}>
                                {i > 0 && ", "}
                                <Link
                                  href={
                                    u.kind === "application"
                                      ? `/applications/${u.id}`
                                      : `/compose/${u.id}`
                                  }
                                  className="break-words underline-offset-4 hover:underline"
                                >
                                  {u.name}
                                </Link>
                              </span>
                            ))
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
