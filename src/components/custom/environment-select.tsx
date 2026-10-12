"use client"

import { Lock } from "lucide-react"
import { useTranslations } from "next-intl"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PRODUCTION_ENVIRONMENT,
  type EnvironmentOption,
} from "@/features/project/project-environment.entity"

/**
 * Which project environment an application or stack receives its variables
 * from (form field `environmentId`). Defaults to production, which is what
 * every resource used before environments existed.
 */
export function EnvironmentSelect({
  namespace,
  environments,
  value,
  id = "environment-id",
  canLinkProtected = true,
}: {
  /** Message namespace holding `form.environment.*`. */
  namespace: "applications" | "compose"
  environments: EnvironmentOption[]
  /** Current environment id; empty = production. */
  value?: string
  id?: string
  /**
   * Whether the user is a project admin. Anyone else cannot link to a
   * protected environment, nor move something away from one (the API
   * answers 403), so those options are disabled instead of failing later.
   */
  canLinkProtected?: boolean
}) {
  const t = useTranslations(`${namespace}.form.environment`)
  if (environments.length === 0) return null
  const current = environments.find((e) => e.id === value)
  const restricted = !canLinkProtected
  // Admins start in production (what resources used before environments);
  // everyone else in the first unprotected one, as the API does when the
  // field is left out.
  const fallback = restricted
    ? (environments.find((e) => e.name === "development" && !e.protected) ??
      environments.find((e) => !e.protected) ??
      environments[0])
    : (environments.find((e) => e.name === PRODUCTION_ENVIRONMENT) ??
      environments[0])
  const selected = current ? current.id : fallback.id
  // A non-admin on a protected environment cannot move away from it.
  const locked = restricted && !!current?.protected
  const disabled = (e: EnvironmentOption) =>
    restricted && e.id !== current?.id && (locked || e.protected)

  return (
    <Field>
      <FieldLabel htmlFor={id}>{t("label")}</FieldLabel>
      <Select name="environmentId" defaultValue={selected}>
        <SelectTrigger id={id} className="w-full sm:w-72">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {environments.map((e) => (
            <SelectItem key={e.id} value={e.id} disabled={disabled(e)}>
              {e.protected && <Lock className="size-3" aria-hidden />}
              {e.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldDescription>
        {t.rich("hint", {
          ref: "${{project.KEY}}",
          code: (chunks) => <code>{chunks}</code>,
        })}{" "}
        {t("switchNote")}
        {restricted && (
          <>
            {" "}
            {locked
              ? t("lockedNote", { name: current?.name ?? "" })
              : current
                ? t("restrictedNote")
                : t("restrictedCreateNote", { name: fallback.name })}
          </>
        )}
      </FieldDescription>
    </Field>
  )
}
