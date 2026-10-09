"use client"

import { useTranslations } from "next-intl"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  createProxyConfigAction,
  getProxyConfigAction,
  updateProxyConfigAction,
} from "@/features/proxy-config/proxy-config.actions"
import {
  CONFIG_NAME,
  type ProxyConfigFile,
  type ProxyConfigSync,
} from "@/features/proxy-config/proxy-config.entity"

/**
 * Resolves `false` when nothing needs confirming, `true` after the operator agreed that the
 * proxy is recreated once, `null` when they declined. Provided by the card.
 */
export type RestartConsent = (willWrite: boolean) => Promise<boolean | null>

/** What the editor opens with: an existing file, or a new one (optionally pre-filled). */
export type EditorTarget =
  | { mode: "edit"; file: ProxyConfigFile }
  | { mode: "new"; name?: string; content?: string }

function reportSync(sync: ProxyConfigSync, t: (key: string) => string) {
  if (sync.proxyRecreated) toast.info(t("recreated"))
  if (sync.warning) toast.warning(sync.warning)
  else if (sync.verified) toast.success(t("savedLoaded"))
  else toast.success(t("saved"))
}

/**
 * YAML editor for one operator file. The API validates the structure, writes the file and reads
 * Traefik's log; a rejection (400) restores the previous version and its message is shown here
 * verbatim. Owner only for writing; admins can read.
 */
export function ProxyConfigEditor({
  target,
  serverId,
  canWrite,
  consent,
  onClose,
}: {
  target: EditorTarget | null
  serverId: string | null
  canWrite: boolean
  consent: RestartConsent
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Dialog
      open={target !== null}
      onOpenChange={(next) => {
        if (!next && !busy) onClose()
      }}
    >
      {target && (
        <EditorForm
          // A fresh form (and fresh state) for every file or preset that is opened.
          key={
            target.mode === "edit"
              ? target.file.id
              : `new-${target.name ?? ""}-${target.content?.length ?? 0}`
          }
          target={target}
          serverId={serverId}
          canWrite={canWrite}
          consent={consent}
          onBusy={setBusy}
          onClose={onClose}
        />
      )}
    </Dialog>
  )
}

function EditorForm({
  target,
  serverId,
  canWrite,
  consent,
  onBusy,
  onClose,
}: {
  target: EditorTarget
  serverId: string | null
  canWrite: boolean
  consent: RestartConsent
  onBusy: (busy: boolean) => void
  onClose: () => void
}) {
  const t = useTranslations("infra.proxyConfigEditor")
  const editing = target.mode === "edit" ? target.file : null
  const [name, setName] = useState(
    target.mode === "new" ? (target.name ?? "") : target.file.name
  )
  const [content, setContent] = useState(
    target.mode === "new" ? (target.content ?? t("template")) : ""
  )
  const [enabled, setEnabled] = useState(
    target.mode === "new" ? true : target.file.enabled
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(editing !== null)
  const [pending, start] = useTransition()

  useEffect(() => {
    if (!editing) return
    let live = true
    void getProxyConfigAction(editing.id).then((r) => {
      if (!live) return
      setLoading(false)
      if (r.ok) setContent(r.data.content)
      else setError(r.error)
    })
    return () => {
      live = false
    }
  }, [editing])

  const nameProblem =
    !editing && name !== "" && !CONFIG_NAME.test(name)
      ? t("nameProblem")
      : null

  const save = () =>
    start(async () => {
      setError(null)
      onBusy(true)
      // An old proxy is recreated once to load the files: ask before, not after.
      const accept = await consent(enabled)
      if (accept === null) return onBusy(false)
      const r = editing
        ? await updateProxyConfigAction(editing.id, {
            content,
            enabled,
            acceptProxyRestart: accept,
          })
        : await createProxyConfigAction({
            name,
            content,
            enabled,
            serverId,
            acceptProxyRestart: accept,
          })
      onBusy(false)
      if (!r.ok) return setError(r.error)
      reportSync(r.data.sync, t)
      onClose()
    })

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>
          {editing
            ? canWrite
              ? t("editTitle", { fileName: editing.fileName })
              : editing.fileName
            : t("newTitle")}
        </DialogTitle>
        <DialogDescription>
          {t.rich("description", { code: (c) => <code>{c}</code> })}
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        {!editing && (
          <Field>
            <FieldLabel htmlFor="pc-name">{t("fileName")}</FieldLabel>
            <Input
              id="pc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              autoComplete="off"
              disabled={!canWrite}
            />
            <FieldDescription>
              {t.rich("writtenAs", {
                name: name || t("nameFallback"),
                code: (c) => <code>{c}</code>,
              })}
            </FieldDescription>
            {nameProblem && (
              <p className="text-xs text-destructive">{nameProblem}</p>
            )}
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="pc-content">{t("content")}</FieldLabel>
          <Textarea
            id="pc-content"
            value={loading ? t("loading") : content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            spellCheck={false}
            readOnly={!canWrite || loading}
            className="font-mono"
          />
        </Field>
        <Field orientation="horizontal">
          <Switch
            id="pc-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={!canWrite}
          />
          <FieldLabel htmlFor="pc-enabled">{t("enabled")}</FieldLabel>
        </Field>
        {error && (
          <p
            className="max-h-40 overflow-auto rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs wrap-anywhere whitespace-pre-wrap text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
      </FieldGroup>
      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onClose}
        >
          {canWrite ? t("cancel") : t("close")}
        </Button>
        {canWrite && (
          <Button
            type="button"
            onClick={save}
            disabled={
              pending ||
              loading ||
              !content.trim() ||
              (!editing && (!name || nameProblem !== null))
            }
          >
            {pending ? t("saving") : t("save")}
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  )
}
