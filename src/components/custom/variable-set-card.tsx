import { FolderKanban, Globe, KeyRound, Lock } from "lucide-react"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { VariableSetSummary } from "@/features/variable-set/variable-set.entity"

/** One set on the Variables list: name, slug, sharing, environments, usage. */
export async function VariableSetCard({ set }: { set: VariableSetSummary }) {
  const t = await getTranslations("variables.list")
  const tr = await getTranslations("variables.roles")
  const sharing = set.sharedWithAll
    ? t("sharedAll")
    : set.projects.length > 0
      ? set.projects.map((p) => p.name).join(", ")
      : t("notShared")

  return (
    <Card className="relative gap-3 transition-colors hover:bg-muted/30">
      <CardHeader>
        <CardTitle className="min-w-0">
          <Link
            href={`/variables/${set.id}`}
            className="block truncate after:absolute after:inset-0 after:content-['']"
          >
            {set.name}
          </Link>
        </CardTitle>
        <CardDescription className="truncate font-mono">
          {set.slug}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {set.description && (
          <p className="line-clamp-2 text-muted-foreground">
            {set.description}
          </p>
        )}
        <p className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          {set.sharedWithAll ? (
            <Globe className="size-3.5 shrink-0" aria-hidden />
          ) : (
            <FolderKanban className="size-3.5 shrink-0" aria-hidden />
          )}
          <span className="sr-only">{t("sharingLabel")}</span>
          <span className="truncate" title={sharing}>
            {sharing}
          </span>
        </p>
        <ul className="flex flex-wrap gap-1.5" aria-label={t("environments")}>
          {set.environments.map((e) => (
            <li key={e.id}>
              <Badge variant="outline" className="gap-1 font-normal">
                {e.protected ? (
                  <Lock className="size-3" aria-label={t("protected")} />
                ) : (
                  <KeyRound className="size-3" aria-hidden />
                )}
                <span className="font-mono">{e.name}</span>
                <span className="text-muted-foreground tabular-nums">
                  {e.keyCount}
                </span>
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2 border-t text-xs text-muted-foreground">
        <span className="min-w-0 truncate">
          {t("usage", {
            apps: set.usage.applications,
            stacks: set.usage.composeApps,
          })}
        </span>
        <Badge variant="secondary" className="shrink-0">
          {tr(set.role)}
        </Badge>
      </CardFooter>
    </Card>
  )
}
