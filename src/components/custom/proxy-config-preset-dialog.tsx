"use client"

import { Wand2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { renderPresetAction } from "@/features/proxy-config/proxy-config.actions"
import type {
  PresetField,
  ProxyPreset,
} from "@/features/proxy-config/proxy-config.entity"

type Values = Record<string, string | boolean>

function initial(preset: ProxyPreset): Values {
  const v: Values = {}
  for (const f of preset.fields) {
    if (f.type === "boolean") v[f.key] = Boolean(f.default)
    else v[f.key] = f.default === undefined ? "" : String(f.default)
  }
  return v
}

/** Only fields that were filled in are sent; the API applies its own defaults to the rest. */
function payload(preset: ProxyPreset, values: Values): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of preset.fields) {
    const v = values[f.key]
    if (f.type === "boolean") out[f.key] = v
    else if (typeof v === "string" && v.trim() !== "") out[f.key] = v.trim()
  }
  return out
}

/**
 * "From preset": a small form per preset (basic auth, security headers, rate limit, IP allowlist,
 * www redirect). It only asks the API for YAML and hands it to the editor — nothing is saved
 * here, and the result is a normal file that can be edited. The basic-auth password is hashed
 * on the server and is not part of the YAML.
 */
export function ProxyConfigPresetDialog({
  presets,
  onResult,
}: {
  presets: ProxyPreset[]
  onResult: (name: string, content: string) => void
}) {
  const t = useTranslations("infra.proxyPresetDialog")
  const [open, setOpen] = useState(false)
  const [id, setId] = useState(presets[0]?.id ?? "")
  const preset = presets.find((p) => p.id === id) ?? presets[0]
  const [values, setValues] = useState<Values>(() =>
    preset ? initial(preset) : {}
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  if (!preset) return null

  const choose = (next: string) => {
    const p = presets.find((x) => x.id === next)
    if (!p) return
    setId(next)
    setValues(initial(p))
    setError(null)
  }
  const set = (key: string, v: string | boolean) =>
    setValues((prev) => ({ ...prev, [key]: v }))

  const submit = () =>
    start(async () => {
      setError(null)
      const r = await renderPresetAction(preset.id, payload(preset, values))
      if (!r.ok) return setError(r.error)
      setOpen(false)
      setValues(initial(preset))
      onResult(r.data.name, r.data.content)
    })

  const missing = preset.fields.some(
    (f) =>
      f.required &&
      f.type !== "boolean" &&
      String(values[f.key] ?? "").trim() === ""
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        setOpen(next)
        if (!next) {
          setValues(initial(preset))
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Wand2 data-icon="inline-start" />
          {t("trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="preset-id">{t("preset")}</FieldLabel>
              <Select value={preset.id} onValueChange={choose}>
                <SelectTrigger id="preset-id">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>{preset.description}</FieldDescription>
            </Field>
            {preset.fields.map((f) => (
              <PresetInput
                key={`${preset.id}-${f.key}`}
                field={f}
                placeholder={f.key === "name" ? preset.defaultName : undefined}
                value={values[f.key]}
                onChange={(v) => set(f.key, v)}
              />
            ))}
            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
          </FieldGroup>
          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending || missing}>
              {pending ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PresetInput({
  field,
  value,
  placeholder,
  onChange,
}: {
  field: PresetField
  value: string | boolean
  placeholder?: string
  onChange: (v: string | boolean) => void
}) {
  const id = `preset-${field.key}`
  if (field.type === "boolean") {
    return (
      <Field orientation="horizontal">
        <Switch id={id} checked={value === true} onCheckedChange={onChange} />
        <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
      </Field>
    )
  }
  return (
    <Field>
      <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
      {field.type === "select" ? (
        <Select value={String(value)} onValueChange={onChange}>
          <SelectTrigger id={id}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.type === "list" ? (
        <Textarea
          id={id}
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          spellCheck={false}
          className="font-mono"
          placeholder={"203.0.113.7\n10.0.0.0/8"}
        />
      ) : (
        <Input
          id={id}
          type={
            field.type === "password"
              ? "password"
              : field.type === "number"
                ? "number"
                : "text"
          }
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={field.type === "password" ? "new-password" : "off"}
        />
      )}
      {field.hint && <FieldDescription>{field.hint}</FieldDescription>}
    </Field>
  )
}
