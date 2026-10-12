"use client"

import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useRouter } from "@/lib/use-router"
import { useActionState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { EnvEditor } from "@/components/custom/env-editor"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ComposeFormState } from "@/features/compose/compose.actions"
import type { GitCredential } from "@/features/git-credential/git-credential.entity"

type Values = NonNullable<ComposeFormState["values"]>

const EMPTY: Values = {
  name: "",
  gitUrl: "",
  gitBranch: "main",
  composePath: "docker-compose.yml",
  gitCredentialId: "",
  env: "",
  composeContent: "",
}

export function ComposeForm({
  action,
  mode = "edit",
  defaultValues,
  submitLabel,
  credentials,
  databaseSlugs,
  source = "git",
  onPendingChange,
  cancelHref,
  readOnly = false,
}: {
  action: (
    prev: ComposeFormState,
    formData: FormData
  ) => Promise<ComposeFormState>
  /** Create mode shows a "creating…" toast and navigates on success instead of staying put. */
  mode?: "create" | "edit"
  defaultValues?: Partial<Values>
  /** Project viewers: show every value but disable all fields and hide Save. */
  readOnly?: boolean
  submitLabel: string
  credentials: GitCredential[]
  databaseSlugs?: string[]
  /** Template stacks edit the compose file itself instead of git settings. */
  source?: "git" | "template"
  /** Create dialog only: lets the dialog lock its close button while submitting. */
  onPendingChange?: (pending: boolean) => void
  /** Standalone create page only: renders a "Cancel" link back to the project. */
  cancelHref?: string
}) {
  const t = useTranslations("compose")
  const tc = useTranslations("common")
  const initial = { ...EMPTY, ...defaultValues }
  const [state, formAction, pending] = useActionState(action, {
    values: initial,
  })
  const router = useRouter()
  const toastIdRef = useRef<string | number | undefined>(undefined)
  const wasPendingRef = useRef(false)
  const v = state.values ?? initial
  const errs = (k: keyof Values) =>
    state.fieldErrors?.[k]?.map((message) => ({ message }))
  const invalid = (k: keyof Values) => !!state.fieldErrors?.[k] || undefined

  // `createComposeAppAction` no longer redirects itself (a server `redirect()`
  // would fire before this toast could be resolved) — navigate once the row
  // exists; the actual deploy keeps running in the background (status
  // `deploying`, polled by the compose page itself).
  useEffect(() => {
    if (mode !== "create") return
    if (wasPendingRef.current && !pending) {
      if (state.createdId) {
        toast.success(
          t("form.toast.created", { name: state.values?.name ?? "" }),
          { id: toastIdRef.current }
        )
        router.push(`/compose/${state.createdId}`)
      } else if (state.error || state.fieldErrors) {
        toast.error(state.error ?? t("form.toast.checkForm"), {
          id: toastIdRef.current,
        })
      }
    }
    wasPendingRef.current = pending
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to a pending->settled transition
  }, [pending])

  useEffect(() => {
    onPendingChange?.(pending)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending])

  return (
    <form
      action={formAction}
      onSubmit={
        mode === "create"
          ? (e) => {
              const formData = new FormData(e.currentTarget)
              toastIdRef.current = toast.loading(
                t("form.toast.creating", {
                  name:
                    String(formData.get("name") || "").trim() ||
                    t("form.toast.newName"),
                })
              )
            }
          : undefined
      }
      noValidate
    >
      <input type="hidden" name="source" value={source} />
      <fieldset disabled={readOnly} className="contents">
      <FieldGroup>
        <Field data-invalid={invalid("name")}>
          <FieldLabel htmlFor="cmp-name">{tc("labels.name")}</FieldLabel>
          <Input id="cmp-name" name="name" defaultValue={v.name} required />
          <FieldError errors={errs("name")} />
        </Field>

        {source === "template" && (
          <Field data-invalid={invalid("composeContent")}>
            <FieldLabel htmlFor="cmp-content">docker-compose.yml</FieldLabel>
            <Textarea
              id="cmp-content"
              name="composeContent"
              defaultValue={v.composeContent}
              rows={18}
              spellCheck={false}
              className="font-mono text-xs"
            />
            <FieldDescription>
              {t("form.templateHint")}
            </FieldDescription>
            <FieldError errors={errs("composeContent")} />
          </Field>
        )}

        {source === "git" && (
          <>
            <Field data-invalid={invalid("gitUrl")}>
              <FieldLabel htmlFor="cmp-git">{t("form.gitRepository")}</FieldLabel>
              <Input
                id="cmp-git"
                name="gitUrl"
                placeholder="https://github.com/org/repo.git"
                defaultValue={v.gitUrl}
                required
              />
              <FieldError errors={errs("gitUrl")} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={invalid("gitBranch")}>
                <FieldLabel htmlFor="cmp-branch">{t("form.branch")}</FieldLabel>
                <Input
                  id="cmp-branch"
                  name="gitBranch"
                  defaultValue={v.gitBranch}
                />
                <FieldError errors={errs("gitBranch")} />
              </Field>
              <Field data-invalid={invalid("composePath")}>
                <FieldLabel htmlFor="cmp-path">{t("form.composeFile")}</FieldLabel>
                <Input
                  id="cmp-path"
                  name="composePath"
                  placeholder="docker-compose.yml"
                  defaultValue={v.composePath}
                />
                <FieldDescription>
                  {t("form.composePathHint")}
                </FieldDescription>
                <FieldError errors={errs("composePath")} />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="cmp-cred">{t("form.gitCredential")}</FieldLabel>
              <Select
                name="gitCredentialId"
                defaultValue={v.gitCredentialId || "none"}
              >
                <SelectTrigger id="cmp-cred">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="none">{t("form.noCredential")}</SelectItem>
                  {credentials.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {c.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </>
        )}

        <Field data-invalid={invalid("env")}>
          <FieldLabel>{t("form.env")}</FieldLabel>
          <EnvEditor
            name="env"
            defaultValue={v.env}
            readOnly={readOnly}
          />
          <FieldDescription>
            {t.rich(databaseSlugs?.length ? "form.envHintDb" : "form.envHint", {
              varExample: "${VAR}",
              projectRef: "${{project.KEY}}",
              code: (chunks) => <code>{chunks}</code>,
              databases: () => (
                <>
                  {(databaseSlugs ?? []).map((s, i) => (
                    <span key={s}>
                      {i > 0 && ", "}
                      <code>{`\${{database.${s}.url}}`}</code>
                    </span>
                  ))}
                </>
              ),
            })}
          </FieldDescription>
          <FieldError errors={errs("env")} />
        </Field>

        {state.error && (
          <FieldDescription className="text-destructive" role="alert">
            {state.error}
          </FieldDescription>
        )}
        {state.saved && !state.error && (
          <FieldDescription>
            {t("form.saved")}
          </FieldDescription>
        )}

        {!readOnly && (
        <div className="flex justify-end gap-2">
          {cancelHref && (
            <Button asChild variant="outline">
              <Link href={cancelHref}>{tc("actions.cancel")}</Link>
            </Button>
          )}
          <Button type="submit" disabled={pending}>
            {pending && (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            )}
            {pending
              ? mode === "create"
                ? tc("states.creating")
                : tc("states.saving")
              : submitLabel}
          </Button>
        </div>
        )}
      </FieldGroup>
      </fieldset>
    </form>
  )
}
