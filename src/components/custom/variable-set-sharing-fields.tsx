"use client"

import { Check } from "lucide-react"
import { useTranslations } from "next-intl"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/**
 * "All projects" vs "Selected projects" plus the project chips, shared by the
 * create dialog and the Sharing card. Controlled; the caller saves.
 */
export function VariableSetSharingFields({
  idPrefix,
  projects,
  sharedWithAll,
  onSharedWithAllChange,
  projectIds,
  onProjectIdsChange,
  disabled = false,
}: {
  idPrefix: string
  projects: { id: string; name: string }[]
  sharedWithAll: boolean
  onSharedWithAllChange: (v: boolean) => void
  projectIds: string[]
  onProjectIdsChange: (ids: string[]) => void
  disabled?: boolean
}) {
  const t = useTranslations("variables.sharing")
  const modes = [
    { value: true, label: t("all"), hint: t("allHint") },
    { value: false, label: t("selected"), hint: t("selectedHint") },
  ]

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label={t("modeLabel")}
        className="grid gap-2 sm:grid-cols-2"
      >
        {modes.map((m) => {
          const on = sharedWithAll === m.value
          return (
            <button
              key={String(m.value)}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={disabled}
              onClick={() => onSharedWithAllChange(m.value)}
              className={cn(
                "flex items-start gap-2 rounded-md border px-3 py-2 text-start text-xs transition-colors disabled:opacity-60",
                on ? "border-primary bg-primary/5" : "hover:bg-muted/60"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full border",
                  on && "border-primary bg-primary text-primary-foreground"
                )}
                aria-hidden
              >
                {on && <span className="size-1.5 rounded-full bg-current" />}
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{m.label}</span>
                <span className="block text-muted-foreground">{m.hint}</span>
              </span>
            </button>
          )
        })}
      </div>

      {!sharedWithAll && (
        <div className="space-y-1.5">
          <Label id={`${idPrefix}-projects`}>{t("projectsLabel")}</Label>
          {projects.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("noProjects")}</p>
          ) : (
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-labelledby={`${idPrefix}-projects`}
            >
              {projects.map((p) => {
                const on = projectIds.includes(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    disabled={disabled}
                    onClick={() =>
                      onProjectIdsChange(
                        on
                          ? projectIds.filter((id) => id !== p.id)
                          : [...projectIds, p.id]
                      )
                    }
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs disabled:opacity-60",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {on && <Check className="size-3" aria-hidden />}
                    {p.name}
                  </button>
                )
              })}
            </div>
          )}
          {projectIds.length === 0 && projects.length > 0 && (
            <p className="text-xs text-muted-foreground">{t("noneSelected")}</p>
          )}
        </div>
      )}
    </div>
  )
}
