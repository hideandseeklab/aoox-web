"use client"

import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { EnvEditor } from "@/components/custom/env-editor"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { updateApplicationEnvAction } from "@/features/application/application.actions"

/**
 * "Values can reference ${{project.KEY}} and the project's databases ..." sentence,
 * shared by the Environment tab and the create form.
 */
export function EnvRefsHint({ databaseSlugs }: { databaseSlugs?: string[] }) {
  const t = useTranslations("applications")
  const code = (chunks: React.ReactNode) => <code>{chunks}</code>
  const projectRef = "${{project.KEY}}"
  if (databaseSlugs && databaseSlugs.length > 0) {
    return (
      <>
        {t.rich("shared.envRefsWithDb", {
          code,
          projectRef,
          databases: () => (
            <>
              {databaseSlugs.map((s, i) => (
                <span key={s}>
                  {i > 0 && ", "}
                  <code>{`\${{database.${s}.url}}`}</code>
                </span>
              ))}
            </>
          ),
        })}
      </>
    )
  }
  return (
    <>
      {t.rich("shared.envRefs", {
        code,
        projectRef,
        databaseRef: "${{database.<slug>.url}}",
      })}
    </>
  )
}

/**
 * The Environment tab: the application's own env, saved on its own (PATCH with
 * only `{ env }`). It used to be a field of the Settings form, where saving any
 * other setting also sent the env; with one place that writes it, the two can
 * no longer overwrite each other. Viewers see it read-only.
 */
export function ApplicationEnvironment({
  applicationId,
  env,
  databaseSlugs,
  canEdit,
}: {
  applicationId: string
  env: string
  databaseSlugs: string[]
  canEdit: boolean
}) {
  const t = useTranslations("applications")
  const tc = useTranslations("common")
  const [saved, setSaved] = useState(env)
  const [pending, setPending] = useState(false)
  const toastId = useRef<string | number | null>(null)
  // The editor submits one `KEY=VALUE` text field (`env`) through a plain form.
  const [formKey, setFormKey] = useState(0)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = String(new FormData(e.currentTarget).get("env") ?? "")
    setPending(true)
    toastId.current = toast.loading(t("environment.saving"))
    const r = await updateApplicationEnvAction(applicationId, value)
    if (r.ok) {
      setSaved(value)
      setFormKey((k) => k + 1)
      toast.success(t("environment.saved"), { id: toastId.current })
    } else {
      toast.error(r.error, { id: toastId.current })
    }
    setPending(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("environment.title")}</CardTitle>
        <CardDescription className="max-w-3xl">
          {t("environment.description")}{" "}
          <EnvRefsHint databaseSlugs={databaseSlugs} />
        </CardDescription>
        {canEdit && (
          <CardAction>
            <Button type="submit" form="application-env-form" disabled={pending}>
              {pending && (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              )}
              {tc("actions.save")}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <form
          id="application-env-form"
          key={formKey}
          onSubmit={onSubmit}
          className="space-y-4"
        >
          <EnvEditor name="env" defaultValue={saved} readOnly={!canEdit} />
          {!canEdit && (
            <p className="text-xs text-muted-foreground">
              {t("environment.readOnly")}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
