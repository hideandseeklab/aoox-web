"use client"

import { Loader2 } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { EnvEditor } from "@/components/custom/env-editor"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { updateApplicationEnvAction } from "@/features/application/application.actions"

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
  const [saved, setSaved] = useState(env)
  const [pending, setPending] = useState(false)
  const toastId = useRef<string | number | null>(null)
  // The editor submits one `KEY=VALUE` text field (`env`) through a plain form.
  const [formKey, setFormKey] = useState(0)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = String(new FormData(e.currentTarget).get("env") ?? "")
    setPending(true)
    toastId.current = toast.loading("Menyimpan environment…")
    const r = await updateApplicationEnvAction(applicationId, value)
    if (r.ok) {
      setSaved(value)
      setFormKey((k) => k + 1)
      toast.success("Environment disimpan", { id: toastId.current })
    } else {
      toast.error(r.error, { id: toastId.current })
    }
    setPending(false)
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Environment</CardTitle>
        <CardDescription>
          Variabel env aplikasi ini. Berlaku pada deploy berikutnya (nilai
          dibaca saat container dibuat), di atas env bersama project: bila key
          sama, yang ini menang. Nilai bisa merujuk{" "}
          <code>{"${{project.KEY}}"}</code>
          {databaseSlugs.length > 0 ? (
            <>
              {" "}
              dan database project ini:{" "}
              {databaseSlugs.map((s, i) => (
                <span key={s}>
                  {i > 0 && ", "}
                  <code>{`\${{database.${s}.url}}`}</code>
                </span>
              ))}{" "}
              (juga <code>.host</code>, <code>.port</code>,{" "}
              <code>.username</code>, <code>.password</code>,{" "}
              <code>.database</code>).
            </>
          ) : (
            <>
              {" "}
              dan <code>{"${{database.<slug>.url}}"}</code>.
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form key={formKey} onSubmit={onSubmit} className="space-y-4">
          <EnvEditor name="env" defaultValue={saved} readOnly={!canEdit} />
          {canEdit ? (
            <Button type="submit" disabled={pending}>
              {pending && (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              )}
              Simpan
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Hanya developer ke atas yang bisa mengubah environment.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
