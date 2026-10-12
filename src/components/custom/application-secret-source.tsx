"use client"

import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useId, useRef, useState } from "react"
import { toast } from "sonner"
import { PathArrow } from "@/components/custom/arrows"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  previewSecretSourceAction,
  saveSecretSourceAction,
} from "@/features/secret-connection/secret-connection.actions"
import type {
  SecretConnection,
  SecretSource,
} from "@/features/secret-connection/secret-connection.entity"

const NONE = "none"

interface Form {
  connectionId: string
  projectId: string
  environment: string
  path: string
  sync: boolean
}

const fromSource = (s: SecretSource | null): Form => ({
  connectionId: s?.connectionId ?? NONE,
  projectId: s?.projectId ?? "",
  environment: s?.environment ?? "",
  path: s?.path ?? "/",
  sync: s?.sync ?? false,
})

/**
 * "Secret source" in the Environment tab: pull secrets from a secret manager
 * connection when the container is created. Anyone with write access to the
 * project can pick a connection (they only see names); creating connections is
 * owner/admin territory in Integrations.
 */
export function ApplicationSecretSource({
  applicationId,
  source,
  connections,
  canEdit,
  canManageConnections,
}: {
  applicationId: string
  source: SecretSource | null
  connections: SecretConnection[]
  canEdit: boolean
  canManageConnections: boolean
}) {
  const t = useTranslations("applications")
  const tc = useTranslations("common")
  const [saved, setSaved] = useState<SecretSource | null>(source)
  const [form, setForm] = useState<Form>(fromSource(source))
  const [busy, setBusy] = useState<"save" | "preview" | null>(null)
  const [keys, setKeys] = useState<string[] | null>(null)
  const toastId = useRef<string | number | null>(null)
  const ids = {
    connection: useId(),
    project: useId(),
    environment: useId(),
    path: useId(),
    sync: useId(),
  }

  const section = () => (
    <>
      {t("secretSource.integrations")}
      <PathArrow />
      {t("secretSource.secretManager")}
    </>
  )
  const dirty =
    JSON.stringify(form) !== JSON.stringify(fromSource(saved)) && canEdit
  const active = form.connectionId !== NONE

  async function save() {
    setBusy("save")
    toastId.current = toast.loading(t("secretSource.toast.saving"))
    const r = await saveSecretSourceAction(applicationId, {
      connectionId: active ? form.connectionId : null,
      projectId: form.projectId,
      environment: form.environment,
      path: form.path,
      sync: form.sync,
    })
    if (r.ok) {
      setSaved(r.data)
      setForm(fromSource(r.data))
      setKeys(null)
      toast.success(
        r.data
          ? t("secretSource.toast.saved")
          : t("secretSource.toast.removed"),
        {
          id: toastId.current,
        }
      )
    } else {
      toast.error(r.error, { id: toastId.current })
    }
    setBusy(null)
  }

  async function preview() {
    setBusy("preview")
    toastId.current = toast.loading(t("secretSource.toast.fetchingKeys"))
    const r = await previewSecretSourceAction(applicationId)
    if (r.ok) {
      setKeys(r.data.keys)
      toast.success(t("secretSource.toast.keyCount", { count: r.data.keys.length }), { id: toastId.current })
    } else {
      setKeys(null)
      toast.error(r.error, { id: toastId.current })
    }
    setBusy(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("secretSource.title")}</CardTitle>
        <CardDescription className="max-w-3xl">
          {t.rich("secretSource.description", {
            code: (chunks) => <code>{chunks}</code>,
            em: (chunks) => <em>{chunks}</em>,
            ref: "${{secret.KEY}}",
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connections.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("secretSource.noConnections")}{" "}
            {canManageConnections
              ? t.rich("secretSource.addAt", {
                  link: (chunks) => (
                    <Link
                      href="/integrations/secrets"
                      className="font-medium text-foreground underline underline-offset-4"
                    >
                      {chunks}
                    </Link>
                  ),
                  section,
                })
              : t.rich("secretSource.askAdmin", { section })}
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                <Label htmlFor={ids.connection}>{t("secretSource.connection")}</Label>
                <Select
                  value={form.connectionId}
                  disabled={!canEdit}
                  onValueChange={(v) => setForm({ ...form, connectionId: v })}
                >
                  <SelectTrigger id={ids.connection} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value={NONE}>{t("secretSource.notUsed")}</SelectItem>
                    {connections.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {active && (
                <>
                  <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                    <Label htmlFor={ids.project}>{t("secretSource.projectId")}</Label>
                    <Input
                      id={ids.project}
                      value={form.projectId}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setForm({ ...form, projectId: e.target.value })
                      }
                      className="font-mono text-xs"
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={ids.environment}>{t("secretSource.environment")}</Label>
                    <Input
                      id={ids.environment}
                      value={form.environment}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setForm({ ...form, environment: e.target.value })
                      }
                      placeholder="prod"
                      className="font-mono text-xs"
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={ids.path}>{t("secretSource.path")}</Label>
                    <Input
                      id={ids.path}
                      value={form.path}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setForm({ ...form, path: e.target.value })
                      }
                      placeholder="/"
                      className="font-mono text-xs"
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-4">
                    <Switch
                      id={ids.sync}
                      checked={form.sync}
                      disabled={!canEdit}
                      onCheckedChange={(v) => setForm({ ...form, sync: v })}
                    />
                    <Label htmlFor={ids.sync} className="text-xs">
                      {t("secretSource.syncAll")}
                    </Label>
                  </div>
                </>
              )}
            </div>

            {canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => void save()}
                  disabled={!dirty || busy !== null}
                >
                  {busy === "save" && (
                    <Loader2
                      data-icon="inline-start"
                      className="animate-spin"
                    />
                  )}
                  {tc("actions.save")}
                </Button>
                {saved && (
                  <Button
                    variant="outline"
                    onClick={() => void preview()}
                    disabled={busy !== null || dirty}
                    title={dirty ? t("secretSource.saveFirst") : undefined}
                  >
                    {busy === "preview" && (
                      <Loader2
                        data-icon="inline-start"
                        className="animate-spin"
                      />
                    )}
                    {t("secretSource.viewKeys")}
                  </Button>
                )}
              </div>
            )}

            {keys && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  {keys.length === 0
                    ? t("secretSource.noKeys")
                    : t("secretSource.keysShown", { count: keys.length })}
                </p>
                {keys.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {keys.map((k) => (
                      <li
                        key={k}
                        className="rounded-md border px-1.5 py-0.5 font-mono text-xs"
                      >
                        {k}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
