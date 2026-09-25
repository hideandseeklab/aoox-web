"use client"

import { useActionState } from "react"
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
  defaultValues,
  submitLabel,
  credentials,
  databaseSlugs,
  source = "git",
}: {
  action: (
    prev: ComposeFormState,
    formData: FormData
  ) => Promise<ComposeFormState>
  defaultValues?: Partial<Values>
  submitLabel: string
  credentials: GitCredential[]
  databaseSlugs?: string[]
  /** Template stacks edit the compose file itself instead of git settings. */
  source?: "git" | "template"
}) {
  const initial = { ...EMPTY, ...defaultValues }
  const [state, formAction, pending] = useActionState(action, {
    values: initial,
  })
  const v = state.values ?? initial
  const errs = (k: keyof Values) =>
    state.fieldErrors?.[k]?.map((message) => ({ message }))
  const invalid = (k: keyof Values) => !!state.fieldErrors?.[k] || undefined

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="source" value={source} />
      <FieldGroup>
        <Field data-invalid={invalid("name")}>
          <FieldLabel htmlFor="cmp-name">Nama</FieldLabel>
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
              Disalin dari template saat dibuat; boleh diubah bebas. Cara
              service dibuka (domain atau IP &amp; port) diatur di kartu Akses.
            </FieldDescription>
            <FieldError errors={errs("composeContent")} />
          </Field>
        )}

        {source === "git" && (
          <>
            <Field data-invalid={invalid("gitUrl")}>
              <FieldLabel htmlFor="cmp-git">Git repository</FieldLabel>
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
                <FieldLabel htmlFor="cmp-branch">Branch</FieldLabel>
                <Input
                  id="cmp-branch"
                  name="gitBranch"
                  defaultValue={v.gitBranch}
                />
                <FieldError errors={errs("gitBranch")} />
              </Field>
              <Field data-invalid={invalid("composePath")}>
                <FieldLabel htmlFor="cmp-path">File compose</FieldLabel>
                <Input
                  id="cmp-path"
                  name="composePath"
                  placeholder="docker-compose.yml"
                  defaultValue={v.composePath}
                />
                <FieldDescription>
                  Relatif dari root repo; path relatif di dalamnya (build,
                  volume) dihitung dari folder file ini.
                </FieldDescription>
                <FieldError errors={errs("composePath")} />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="cmp-cred">Kredensial Git</FieldLabel>
              <Select
                name="gitCredentialId"
                defaultValue={v.gitCredentialId || "none"}
              >
                <SelectTrigger id="cmp-cred">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak ada (repo publik)</SelectItem>
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
          <FieldLabel>Environment (.env)</FieldLabel>
          <EnvEditor name="env" defaultValue={v.env} />
          <FieldDescription>
            Ditulis ke <code>.aoox.env</code> dan dipakai sebagai sumber
            interpolasi <code>{"${VAR}"}</code> di file compose (tidak otomatis
            masuk ke container — pakai <code>environment:</code> atau{" "}
            <code>env_file: .aoox.env</code>). Mendukung{" "}
            <code>{"${{project.KEY}}"}</code>
            {databaseSlugs?.length ? (
              <>
                {" "}
                dan{" "}
                {databaseSlugs.map((s, i) => (
                  <span key={s}>
                    {i > 0 && ", "}
                    <code>{`\${{database.${s}.url}}`}</code>
                  </span>
                ))}
              </>
            ) : null}
            .
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
            Tersimpan — berlaku pada deploy berikutnya.
          </FieldDescription>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Menyimpan…" : submitLabel}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
