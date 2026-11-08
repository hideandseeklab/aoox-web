"use client"

import { CloudUpload, Plus, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useActionState, useState, useTransition } from "react"
import { TestButton, TestResult } from "@/components/custom/test-result"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  createBackupDestinationAction,
  deleteBackupDestinationAction,
  testBackupDestinationAction,
  type BackupDestinationFormState,
} from "@/features/backup-destination/backup-destination.actions"
import type {
  BackupDestination,
  BackupDestinationTestResult,
} from "@/features/backup-destination/backup-destination.entity"

/** Settings card: S3-compatible buckets database backups are copied to. */
export function BackupDestinationsCard({
  destinations,
}: {
  destinations: BackupDestination[]
}) {
  const t = useTranslations("settings")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tests, setTests] = useState<
    Record<string, BackupDestinationTestResult>
  >({})

  const [testingId, setTestingId] = useState<string | null>(null)

  const test = (id: string) => {
    // Set outside the transition: updates made inside one only commit when it ends.
    setTestingId(id)
    start(async () => {
      setError(null)
      const r = await testBackupDestinationAction(id)
      setTestingId(null)
      if (r.ok) setTests((prev) => ({ ...prev, [id]: r.data }))
      else setError(r.error)
    })
  }

  const remove = (id: string) =>
    start(async () => {
      setError(null)
      const r = await deleteBackupDestinationAction(id)
      if (!r.ok) setError(r.error)
    })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{t("backupDestinations.title")}</CardTitle>
            <CardDescription>
              {t("backupDestinations.description")}
            </CardDescription>
          </div>
          <AddDestinationDialog />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <ul className="divide-y rounded-md border">
          {destinations.map((d) => {
            const result = tests[d.id]
            // The API only reports the object count inside its message.
            const found = result?.ok
              ? /\((\d+) object/.exec(result.message)?.[1]
              : undefined
            const objects = found === undefined ? null : Number(found)
            return (
              <li key={d.id} className="space-y-1 px-3 py-2">
                <div className="flex items-center gap-3">
                  <CloudUpload className="size-4 shrink-0 text-muted-foreground" />
                  <span className="max-w-40 min-w-0 truncate font-medium">
                    {d.name}
                  </span>
                  <span className="hidden truncate font-mono text-xs text-muted-foreground sm:inline">
                    s3://{d.bucket}
                    {d.prefix ? `/${d.prefix}` : ""} ·{" "}
                    {d.endpoint
                      ? d.endpoint.replace(/^https?:\/\//, "")
                      : `AWS ${d.region || t("backupDestinations.regionUnknown")}`}
                  </span>
                  <span className="ms-auto" />
                  <TestButton
                    ariaLabel={t("backupDestinations.testAria", {
                      name: d.name,
                    })}
                    testing={testingId === d.id}
                    disabled={pending}
                    onClick={() => test(d.id)}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("backupDestinations.deleteAria", {
                      name: d.name,
                    })}
                    disabled={pending}
                    onClick={() => remove(d.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
                {result && (
                  <TestResult
                    status={result.ok ? "success" : "failure"}
                    detail={
                      objects === null
                        ? undefined
                        : t("backupDestinations.testObjects", {
                            count: objects,
                          })
                    }
                  >
                    {result.ok
                      ? t("backupDestinations.testOk")
                      : result.message}
                  </TestResult>
                )}
              </li>
            )
          })}
        </ul>
        {error && (
          <p className="text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

const initialState: BackupDestinationFormState = {}

/** `size`: "sm" in a card header, "default" as the action of an empty state. */
export function AddDestinationDialog({
  size = "sm",
}: {
  size?: "sm" | "default"
}) {
  const t = useTranslations("settings")
  const c = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(
    async (prev: BackupDestinationFormState, formData: FormData) => {
      const next = await createBackupDestinationAction(prev, formData)
      if (next.created) setOpen(false)
      return next
    },
    initialState
  )
  const errs = (
    k: keyof NonNullable<BackupDestinationFormState["fieldErrors"]>
  ) => state.fieldErrors?.[k]?.map((message) => ({ message }))
  const invalid = (
    k: keyof NonNullable<BackupDestinationFormState["fieldErrors"]>
  ) => !!state.fieldErrors?.[k] || undefined

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size}>
          <Plus data-icon="inline-start" />
          {c("actions.add")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("backupDestinations.dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("backupDestinations.dialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <form action={action} noValidate>
          <FieldGroup>
            <Field data-invalid={invalid("name")}>
              <FieldLabel htmlFor="bd-name">{c("labels.name")}</FieldLabel>
              <Input
                id="bd-name"
                name="name"
                defaultValue={state.values?.name}
                required
              />
              <FieldError errors={errs("name")} />
            </Field>
            <Field data-invalid={invalid("endpoint")}>
              <FieldLabel htmlFor="bd-endpoint">Endpoint</FieldLabel>
              <Input
                id="bd-endpoint"
                name="endpoint"
                placeholder={t("backupDestinations.endpointPlaceholder")}
                defaultValue={state.values?.endpoint}
              />
              <FieldError errors={errs("endpoint")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={invalid("bucket")}>
                <FieldLabel htmlFor="bd-bucket">Bucket</FieldLabel>
                <Input
                  id="bd-bucket"
                  name="bucket"
                  defaultValue={state.values?.bucket}
                  required
                />
                <FieldError errors={errs("bucket")} />
              </Field>
              <Field data-invalid={invalid("region")}>
                <FieldLabel htmlFor="bd-region">Region</FieldLabel>
                <Input
                  id="bd-region"
                  name="region"
                  placeholder={t("backupDestinations.regionPlaceholder")}
                  defaultValue={state.values?.region}
                />
                <FieldError errors={errs("region")} />
              </Field>
            </div>
            <Field data-invalid={invalid("prefix")}>
              <FieldLabel htmlFor="bd-prefix">Prefix</FieldLabel>
              <Input
                id="bd-prefix"
                name="prefix"
                placeholder={t("backupDestinations.prefixPlaceholder")}
                defaultValue={state.values?.prefix}
              />
              <FieldError errors={errs("prefix")} />
            </Field>
            <Field data-invalid={invalid("accessKeyId")}>
              <FieldLabel htmlFor="bd-ak">
                {t("backupDestinations.accessKeyId")}
              </FieldLabel>
              <Input
                id="bd-ak"
                name="accessKeyId"
                autoComplete="off"
                defaultValue={state.values?.accessKeyId}
                required
              />
              <FieldError errors={errs("accessKeyId")} />
            </Field>
            <Field data-invalid={invalid("secretAccessKey")}>
              <FieldLabel htmlFor="bd-sk">
                {t("backupDestinations.secretAccessKey")}
              </FieldLabel>
              <Input
                id="bd-sk"
                name="secretAccessKey"
                type="password"
                autoComplete="off"
                required
              />
              <FieldDescription>
                {t("backupDestinations.secretHelp")}
              </FieldDescription>
              <FieldError errors={errs("secretAccessKey")} />
            </Field>
            <Field>
              <label className="flex items-center gap-2 text-xs">
                <Switch name="forcePathStyle" defaultChecked />
                <span>
                  {t.rich("backupDestinations.pathStyle", {
                    code: (chunks) => <code>{chunks}</code>,
                  })}
                </span>
              </label>
            </Field>
            {state.error && (
              <FieldDescription className="text-destructive" role="alert">
                {state.error}
              </FieldDescription>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? c("states.saving") : c("actions.save")}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
