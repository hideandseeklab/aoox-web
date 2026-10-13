"use client"

import { Lock } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fetchProjectVariableSetsAction } from "@/features/variable-set/variable-set.actions"
import type { ProjectVariableSet } from "@/features/variable-set/variable-set.entity"

const NONE = "none"

/**
 * One optional set environment for a create flow whose project is picked on
 * the client (the template dialog). Loads the sets shared with the project;
 * hidden when there are none. More links can be added on the stack later.
 */
export function VariableSetPicker({
  id,
  projectId,
  value,
  onChange,
}: {
  id: string
  projectId: string
  /** Environment id, or "" for none. */
  value: string
  onChange: (environmentId: string) => void
}) {
  const t = useTranslations("variables.picker")
  // Sets per project id, so switching back does not refetch.
  const [loaded, setLoaded] = useState<Record<string, ProjectVariableSet[]>>({})
  const sets = loaded[projectId]

  useEffect(() => {
    if (!projectId || loaded[projectId]) return
    let cancelled = false
    fetchProjectVariableSetsAction(projectId).then((r) => {
      if (cancelled) return
      setLoaded((cur) => ({ ...cur, [projectId]: r.ok ? r.data : [] }))
    })
    return () => {
      cancelled = true
    }
  }, [projectId, loaded])

  if (!sets || sets.length === 0) return null
  const known = sets.some((s) => s.environments.some((e) => e.id === value))

  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{t("label")}</Label>
      <Select
        value={known ? value : NONE}
        onValueChange={(v) => onChange(v === NONE ? "" : v)}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value={NONE}>{t("none")}</SelectItem>
          {sets.map((s) => (
            <SelectGroup key={s.id}>
              <SelectLabel>{s.name}</SelectLabel>
              {s.environments.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.protected && <Lock className="size-3" aria-hidden />}
                  <span className="font-mono">{e.name}</span>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{t("hint")}</p>
    </div>
  )
}
